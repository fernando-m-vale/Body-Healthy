import { useCallback, useEffect, useRef, useState } from "react";

// Carregado dinamicamente, só quando o timer é de fato usado — testado no
// Android real via Expo Go, o `import * as Notifications from
// "expo-notifications"` ESTÁTICO já lança na hora de carregar o módulo
// ("...removed from Expo Go with the release of SDK 53. Use a development
// build..."), derrubando qualquer tela que importe este arquivo, em cascata
// (inclusive o login, porque o Expo Router avalia os arquivos de rota cedo).
// Isso contradiz a documentação oficial (que fala só de notificação
// remota/push saindo do Expo Go, não a local) — mas o comportamento real no
// dispositivo é o que vale. Import dinâmico + try/catch duplo (síncrono e
// na promise) contém a falha só aqui: o resto da sessão ao vivo (timer
// visual, registro de séries) continua funcionando normalmente nesse
// ambiente, só a notificação de fundo fica indisponível, sem crash.
type NotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (!notificationsModulePromise) {
    try {
      notificationsModulePromise = import("expo-notifications")
        .then((mod) => mod)
        .catch(() => null);
    } catch {
      notificationsModulePromise = Promise.resolve(null);
    }
  }
  return notificationsModulePromise;
}

// "v2" é proposital: canal de notificação Android é imutável depois de
// criado — qualquer mudança de config (sound, vibrationPattern) num
// channelId já existente no aparelho é ignorada silenciosamente pelo SO,
// mesmo com o app reinstalado com código novo. O primeiro canal ("rest-
// timer") foi criado num build anterior com `sound: "default"` inválido, e
// ficou travado sem som/vibração mesmo depois do código ser corrigido —
// achado em teste real. Trocar o id força o Android a criar um canal novo
// do zero com a config atual. Se isso precisar mudar de novo no futuro,
// bump a versão de novo (v3, v4...) em vez de editar a config no mesmo id.
const CHANNEL_ID = "rest-timer-v2";
let handlerConfigured = false;

// Configura como uma notificação se comporta se chegar com o app aberto
// (Spec 09, seção 5.5: sinal sonoro/vibração mesmo em primeiro plano) —
// só precisa rodar uma vez por processo do app.
function ensureNotificationHandler(Notifications: NotificationsModule) {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureChannelAndPermission(Notifications: NotificationsModule): Promise<void> {
  ensureNotificationHandler(Notifications);
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  }
  // No-op em iOS (canal é conceito só do Android) — seguro chamar sem
  // checagem de plataforma. A string literal "default" pro campo `sound`
  // (tanto aqui quanto no content.sound do scheduleNotificationAsync
  // abaixo) é sempre errada — conferido direto no tipo real instalado
  // (NotificationChannelManager.types.d.ts): o tipo de ENTRADA é
  // `sound?: string | null`, onde `null` pede o som padrão do sistema;
  // `'default'`/`'custom'` só existem no tipo de SAÍDA (o que volta ao
  // ler o canal já criado, reportando qual dos dois está em uso). Passar
  // "default" como entrada faz o Android procurar um arquivo de som
  // customizado literalmente chamado "default", que não existe — daí
  // "Custom sound 'default' not found in native app" (erro idêntico nas
  // duas vezes: primeiro no content.sound, corrigido; depois aqui no
  // canal, só agora corrigido de verdade). Testado no dispositivo real
  // nas duas rodadas antes de fechar a spec.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Descanso entre séries",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export interface RestTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string;
  nextSetNumber: number;
}

// Timer de descanso (Spec 09, seção 5.5) — contagem visível é inteiramente
// client-side/efêmera (não persiste nada); em paralelo, tenta agendar uma
// notificação local do SO (TIME_INTERVAL, não precisa de
// SCHEDULE_EXACT_ALARM) como rede de segurança pro aviso sonoro/vibração
// chegar mesmo com o app em segundo plano. Em ambientes onde o módulo não
// carrega (Expo Go no Android, achado testando no dispositivo — ver nota
// acima), a notificação de fundo simplesmente não é agendada, sem quebrar a
// contagem visual nem o resto da sessão. Timer mais recente sempre substitui
// o anterior (nunca empilha, §8).
// Tempo que a barra fica visível em 00:00 depois do sinal, antes de sumir
// sozinha (Spec 09 v7, seção 5.5) — só o suficiente pra confirmar
// visualmente que o descanso acabou, sem exigir toque em "Pular".
const AUTO_DISMISS_MS = 3000;

export function useRestTimer() {
  const [state, setState] = useState<RestTimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const clearLocal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const skip = useCallback(async () => {
    clearLocal();
    deadlineRef.current = null;
    if (notificationIdRef.current) {
      const id = notificationIdRef.current;
      notificationIdRef.current = null;
      const Notifications = await loadNotificationsModule();
      if (Notifications) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {
          // Já disparou ou não existe mais — sem problema, nada a cancelar.
        });
      }
    }
    setState(null);
  }, [clearLocal]);

  const start = useCallback(
    async (totalSeconds: number, exerciseName: string, nextSetNumber: number) => {
      await skip();

      deadlineRef.current = Date.now() + totalSeconds * 1000;
      setState({ totalSeconds, remainingSeconds: totalSeconds, exerciseName, nextSetNumber });

      intervalRef.current = setInterval(() => {
        if (!deadlineRef.current) return;
        const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
        setState((prev) => (prev ? { ...prev, remainingSeconds: remaining } : prev));
        if (remaining <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Some sozinha pouco depois do sinal — não fica travada em 00:00
          // esperando toque em "Pular" (Spec 09 v7, seção 5.5).
          dismissTimeoutRef.current = setTimeout(() => setState(null), AUTO_DISMISS_MS);
        }
      }, 250);

      try {
        const Notifications = await loadNotificationsModule();
        if (!Notifications) return;
        await ensureChannelAndPermission(Notifications);
        notificationIdRef.current = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Descanso concluído",
            body: `Próxima série: ${exerciseName} · série ${nextSetNumber}`,
            // Sem `sound` aqui — o som/vibração já vêm da config do canal
            // Android acima (`sound: null` lá pede o padrão do sistema; a
            // string "default" seria interpretada como nome de arquivo
            // customizado e falha). No iOS, omitir também cai no som
            // padrão do sistema.
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: totalSeconds },
        });
      } catch {
        // Sem permissão concedida, módulo indisponível no ambiente, ou
        // notificação indisponível no dispositivo — a contagem visual e o
        // "Pular" continuam funcionando normalmente, só perde o aviso em
        // segundo plano.
      }
    },
    [clearLocal, skip],
  );

  useEffect(() => clearLocal, [clearLocal]);

  return { state, start, skip };
}
