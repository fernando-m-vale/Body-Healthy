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

const CHANNEL_ID = "rest-timer";
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
  // checagem de plataforma. `sound: "default"` é válido AQUI (canal), mas
  // NÃO no `content.sound` do scheduleNotificationAsync abaixo — lá o
  // Android trata a string como nome de arquivo de som customizado e
  // quebra com "Custom sound 'default' not found in native app" (achado
  // testando no development build real). Testado no dispositivo antes de
  // fechar a spec.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Descanso entre séries",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
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
export function useRestTimer() {
  const [state, setState] = useState<RestTimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const clearLocal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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
        if (remaining <= 0) clearLocal();
      }, 250);

      try {
        const Notifications = await loadNotificationsModule();
        if (!Notifications) return;
        await ensureChannelAndPermission(Notifications);
        notificationIdRef.current = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Descanso concluído",
            body: `Próxima série: ${exerciseName} · série ${nextSetNumber}`,
            // Sem `sound` aqui — o som/vibração já vêm do canal Android
            // configurado acima (`sound: "default"` lá é o valor certo; aqui
            // seria interpretado como nome de arquivo customizado e falha).
            // No iOS, omitir também cai no som padrão do sistema.
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
