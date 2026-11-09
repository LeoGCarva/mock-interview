export const LANGUAGES = ["en-US", "pt-BR"] as const;
export type Language = (typeof LANGUAGES)[number];

export const QUESTION_COUNTS = [3, 5, 8, 10] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];
export const DEFAULT_QUESTION_COUNT: QuestionCount = 5;

export const LANGUAGE_LABELS: Record<Language, string> = {
  "en-US": "English",
  "pt-BR": "Português (Brasil)",
};

/** Language name used inside prompts sent to Gemini. */
export const LANGUAGE_PROMPT_NAMES: Record<Language, string> = {
  "en-US": "English",
  "pt-BR": "Brazilian Portuguese (português do Brasil)",
};

/**
 * Fixed first user message. The API needs the conversation to start with a
 * user turn, and keeping it constant per language keeps the prompt prefix
 * cache-friendly.
 */
export const KICKOFF_MESSAGE: Record<Language, string> = {
  "en-US": "Hi, I'm ready to start the interview.",
  "pt-BR": "Olá, estou pronto(a) para começar a entrevista.",
};

export function detectDefaultLanguage(): Language {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
}

const en = {
  appTitle: "Mock Interview",
  appSubtitle:
    "Practice job interviews out loud with an AI interviewer that adapts to your answers.",
  howItWorks: "How it works",
  steps: [
    {
      title: "You speak",
      body: "Answer with your microphone. Your words are transcribed live and can't be edited, just like a real interview.",
    },
    {
      title: "The interviewer thinks",
      body: "Gemini reads your answer and decides what to ask next: a follow-up or a new topic.",
    },
    {
      title: "The interviewer speaks",
      body: "The reply is read out loud, and the cycle repeats until the interview ends.",
    },
  ],
  jobDescriptionLabel: "Job description",
  jobDescriptionPlaceholder:
    "Paste the job posting here: title, company, responsibilities, requirements…",
  jobDescriptionCount: (n: number, min: number, max: number) =>
    n < min
      ? `${n} characters (at least ${min} needed)`
      : `${n.toLocaleString("en-US")} / ${max.toLocaleString("en-US")} characters`,
  languageLabel: "Interview language",
  questionsLabel: "Number of questions",
  questionsOption: (n: number) => `${n} questions`,
  voiceLabel: "Interviewer voice",
  voiceAuto: "Automatic (best available)",
  noVoices: "No voices for this language were found on this device.",
  testVoice: "Test voice",
  voiceTestPhrase: "Hello! I'll be your interviewer today. Let's get started.",
  startInterview: "Start interview",
  checkingMic: "Checking microphone…",
  micDenied:
    "Microphone access was blocked. Allow it from the icon in the browser's address bar, then try again.",
  unsupportedStt:
    "This browser can't transcribe speech. Please use Google Chrome or Microsoft Edge on a desktop computer.",
  unsupportedTts:
    "This browser can't read text aloud, so the interviewer's replies will appear as text only.",
  privacyNote:
    "Speech recognition is done by your browser (Chrome and Edge send audio to their cloud service). Nothing is stored: closing the tab erases the interview.",

  questionProgress: (k: number, n: number) => `Question ${k} of ${n}`,
  closingProgress: "Wrapping up",
  statusThinking: "The interviewer is thinking…",
  statusSpeaking: "The interviewer is speaking…",
  statusYourTurn: "Your turn. Press the button and answer out loud.",
  statusListening: "Listening… press “Finish answer” when you're done.",
  statusInterrupted: "Recording stopped. Continue answering or submit what you have.",
  statusClosing: "The interview is over. Preparing your feedback…",
  statusError: "Something went wrong.",
  interviewer: "Interviewer",
  you: "You",
  startAnswer: "Start answering",
  finishAnswer: "Finish answer",
  continueAnswer: "Continue answering",
  submitAnswer: "Submit answer",
  liveTranscriptLabel: "Your answer: live transcript",
  readOnly: "Read-only",
  liveTranscriptEmpty: "Your words will appear here as you speak.",
  nothingHeard:
    "We didn't catch anything. Check that the right microphone is selected and try again.",
  replay: "Replay",
  stopVoice: "Skip voice",
  mute: "Mute",
  unmute: "Unmute",
  endInterview: "End interview",
  confirmEnd:
    "End the interview now? You'll get feedback on the questions you've answered so far.",
  retry: "Try again",
  backToSetup: "Back to setup",

  sttErrors: {
    "not-allowed":
      "Microphone access is blocked. Allow it from the browser's address bar and try again.",
    "service-not-allowed":
      "Speech recognition isn't available in this browser. Use Google Chrome or Microsoft Edge.",
    "audio-capture": "No microphone was found. Connect one and try again.",
    network:
      "Speech recognition needs an internet connection. Check your connection and try again.",
    "language-not-supported": "Speech recognition doesn't support this language in this browser.",
    default: "Speech recognition stopped unexpectedly.",
  } as Record<string, string>,

  apiErrors: {
    missing_api_key:
      "The server has no Google Gemini API key. Add GEMINI_API_KEY to .env.local and restart the server.",
    auth: "The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local.",
    rate_limit: "Too many requests right now. Wait a few seconds and try again.",
    overloaded: "The AI service is overloaded right now. Try again in a moment.",
    connection: "Couldn't reach the AI service. Check your connection and try again.",
    refusal:
      "The interviewer couldn't respond to that answer. Try again, or end the interview.",
    bad_request: "The request was invalid.",
    unknown: "Unexpected error from the AI service.",
  } as Record<string, string>,

  feedbackTitle: "Interview feedback",
  generatingFeedback: "Generating your feedback report…",
  generatingFeedbackHint: "Gemini is reviewing every answer. This usually takes a few seconds.",
  feedbackFailed: "Couldn't generate the feedback report.",
  overallScore: "Overall score",
  summary: "Summary",
  strengths: "Strengths",
  improvements: "What to improve",
  questionByQuestion: "Question by question",
  answerSummary: "Your answer",
  whatWentWell: "What went well",
  toImprove: "What to improve",
  strongerAnswer: "How to make it stronger",
  nextSteps: "Next steps",
  transcript: "Transcript",
  readSummary: "Read summary aloud",
  stopReading: "Stop reading",
  download: "Download report (.md)",
  practiceAgain: "Practice again (same job)",
  newJob: "New job description",
  scoreOutOf: (n: number) => `${n}/10`,
  reportFileName: "mock-interview-report",
  reportGeneratedOn: (date: string) => `Generated on ${date}`,
  jobDescription: "Job description",
};

export type Messages = typeof en;

const ptBR: Messages = {
  appTitle: "Simulador de Entrevista",
  appSubtitle:
    "Pratique entrevistas de emprego em voz alta com um entrevistador de IA que se adapta às suas respostas.",
  howItWorks: "Como funciona",
  steps: [
    {
      title: "Você fala",
      body: "Responda pelo microfone. Suas palavras são transcritas ao vivo e não podem ser editadas, como numa entrevista real.",
    },
    {
      title: "O entrevistador pensa",
      body: "O Gemini lê sua resposta e decide o que perguntar em seguida: um aprofundamento ou um novo tema.",
    },
    {
      title: "O entrevistador fala",
      body: "A resposta é lida em voz alta, e o ciclo se repete até o fim da entrevista.",
    },
  ],
  jobDescriptionLabel: "Descrição da vaga",
  jobDescriptionPlaceholder:
    "Cole aqui o anúncio da vaga: cargo, empresa, responsabilidades, requisitos…",
  jobDescriptionCount: (n: number, min: number, max: number) =>
    n < min
      ? `${n} caracteres (mínimo de ${min})`
      : `${n.toLocaleString("pt-BR")} / ${max.toLocaleString("pt-BR")} caracteres`,
  languageLabel: "Idioma da entrevista",
  questionsLabel: "Número de perguntas",
  questionsOption: (n: number) => `${n} perguntas`,
  voiceLabel: "Voz do entrevistador",
  voiceAuto: "Automática (melhor disponível)",
  noVoices: "Nenhuma voz para este idioma foi encontrada neste dispositivo.",
  testVoice: "Testar voz",
  voiceTestPhrase: "Olá! Eu serei seu entrevistador hoje. Vamos começar.",
  startInterview: "Começar entrevista",
  checkingMic: "Verificando o microfone…",
  micDenied:
    "O acesso ao microfone foi bloqueado. Libere pelo ícone na barra de endereço do navegador e tente novamente.",
  unsupportedStt:
    "Este navegador não transcreve fala. Use o Google Chrome ou o Microsoft Edge em um computador.",
  unsupportedTts:
    "Este navegador não lê texto em voz alta; as falas do entrevistador aparecerão só como texto.",
  privacyNote:
    "O reconhecimento de fala é feito pelo navegador (Chrome e Edge enviam o áudio para o serviço em nuvem deles). Nada é salvo: fechar a aba apaga a entrevista.",

  questionProgress: (k: number, n: number) => `Pergunta ${k} de ${n}`,
  closingProgress: "Encerrando",
  statusThinking: "O entrevistador está pensando…",
  statusSpeaking: "O entrevistador está falando…",
  statusYourTurn: "Sua vez. Aperte o botão e responda em voz alta.",
  statusListening: "Ouvindo… aperte “Finalizar resposta” quando terminar.",
  statusInterrupted: "A gravação parou. Continue respondendo ou envie o que já disse.",
  statusClosing: "A entrevista terminou. Preparando seu feedback…",
  statusError: "Algo deu errado.",
  interviewer: "Entrevistador",
  you: "Você",
  startAnswer: "Começar a responder",
  finishAnswer: "Finalizar resposta",
  continueAnswer: "Continuar respondendo",
  submitAnswer: "Enviar resposta",
  liveTranscriptLabel: "Sua resposta: transcrição ao vivo",
  readOnly: "Somente leitura",
  liveTranscriptEmpty: "Suas palavras aparecerão aqui enquanto você fala.",
  nothingHeard:
    "Não captamos nada. Verifique se o microfone certo está selecionado e tente novamente.",
  replay: "Repetir",
  stopVoice: "Pular voz",
  mute: "Silenciar",
  unmute: "Ativar som",
  endInterview: "Encerrar entrevista",
  confirmEnd:
    "Encerrar a entrevista agora? Você receberá feedback sobre as perguntas respondidas até aqui.",
  retry: "Tentar novamente",
  backToSetup: "Voltar ao início",

  sttErrors: {
    "not-allowed":
      "O acesso ao microfone está bloqueado. Libere pela barra de endereço do navegador e tente novamente.",
    "service-not-allowed":
      "O reconhecimento de fala não está disponível neste navegador. Use o Google Chrome ou o Microsoft Edge.",
    "audio-capture": "Nenhum microfone foi encontrado. Conecte um e tente novamente.",
    network:
      "O reconhecimento de fala precisa de internet. Verifique sua conexão e tente novamente.",
    "language-not-supported":
      "O reconhecimento de fala não suporta este idioma neste navegador.",
    default: "O reconhecimento de fala parou inesperadamente.",
  },

  apiErrors: {
    missing_api_key:
      "O servidor não tem uma chave da API do Google Gemini. Adicione GEMINI_API_KEY ao .env.local e reinicie o servidor.",
    auth: "A chave da API do Gemini foi recusada. Verifique GEMINI_API_KEY no .env.local.",
    rate_limit: "Muitas requisições agora. Aguarde alguns segundos e tente novamente.",
    overloaded: "O serviço de IA está sobrecarregado no momento. Tente novamente em instantes.",
    connection: "Não foi possível acessar o serviço de IA. Verifique sua conexão e tente novamente.",
    refusal:
      "O entrevistador não conseguiu responder a essa resposta. Tente novamente ou encerre a entrevista.",
    bad_request: "A requisição era inválida.",
    unknown: "Erro inesperado do serviço de IA.",
  },

  feedbackTitle: "Feedback da entrevista",
  generatingFeedback: "Gerando seu relatório de feedback…",
  generatingFeedbackHint: "O Gemini está analisando cada resposta. Isso costuma levar alguns segundos.",
  feedbackFailed: "Não foi possível gerar o relatório de feedback.",
  overallScore: "Nota geral",
  summary: "Resumo",
  strengths: "Pontos fortes",
  improvements: "O que melhorar",
  questionByQuestion: "Pergunta por pergunta",
  answerSummary: "Sua resposta",
  whatWentWell: "O que foi bem",
  toImprove: "O que melhorar",
  strongerAnswer: "Como deixar mais forte",
  nextSteps: "Próximos passos",
  transcript: "Transcrição",
  readSummary: "Ler resumo em voz alta",
  stopReading: "Parar leitura",
  download: "Baixar relatório (.md)",
  practiceAgain: "Praticar de novo (mesma vaga)",
  newJob: "Nova descrição de vaga",
  scoreOutOf: (n: number) => `${n}/10`,
  reportFileName: "relatorio-entrevista",
  reportGeneratedOn: (date: string) => `Gerado em ${date}`,
  jobDescription: "Descrição da vaga",
};

const MESSAGES: Record<Language, Messages> = { "en-US": en, "pt-BR": ptBR };

export function getMessages(language: Language): Messages {
  return MESSAGES[language];
}
