import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Loader2, Trash2, Volume2 } from "lucide-react";

type AudioRecorderProps = {
  onRecordingComplete: (audioBase64: string, mimeType: string) => void;
  isProcessing?: boolean;
  existingAudioUrl?: string | null;
  disabled?: boolean;
};

export default function AudioRecorder({
  onRecordingComplete,
  isProcessing = false,
  existingAudioUrl,
  disabled = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl ?? null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Update audioUrl when existingAudioUrl changes
  useEffect(() => {
    if (existingAudioUrl) setAudioUrl(existingAudioUrl);
  }, [existingAudioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgb(248, 250, 252)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(20, 184, 166)";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Prefer webm, fallback to mp4
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert to base64 and notify parent
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          const simpleMime = mimeType.split(";")[0];
          onRecordingComplete(base64, simpleMime);
        };
        reader.readAsDataURL(blob);

        // Stop stream tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(250); // collect data every 250ms
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start waveform
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Verificá los permisos del navegador.");
    }
  }, [onRecordingComplete, drawWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
  }, [isRecording]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {/* Recording / Playback controls */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        {!isRecording && !audioUrl && !isProcessing && (
          <>
            <Button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex-shrink-0"
            >
              <Mic className="h-6 w-6" />
            </Button>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Grabar consulta</p>
              <p>Tocá el micrófono y describí la consulta. La IA completará los campos automáticamente.</p>
            </div>
          </>
        )}

        {isRecording && (
          <>
            <Button
              type="button"
              onClick={stopRecording}
              className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse flex-shrink-0"
            >
              <Square className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-600">Grabando...</span>
                <span className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={300}
                height={40}
                className="w-full h-10 rounded bg-slate-100"
              />
            </div>
          </>
        )}

        {isProcessing && (
          <>
            <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-teal-700">Procesando audio...</p>
              <p className="text-muted-foreground">Transcribiendo y extrayendo datos clínicos con IA</p>
            </div>
          </>
        )}

        {audioUrl && !isRecording && !isProcessing && (
          <>
            <Button
              type="button"
              onClick={togglePlayback}
              variant="outline"
              className="h-14 w-14 rounded-full flex-shrink-0 border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-700">
                  {isPlaying ? "Reproduciendo..." : "Audio grabado"}
                </span>
                {recordingTime > 0 && (
                  <span className="text-xs text-muted-foreground">({formatTime(recordingTime)})</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tocá para {isPlaying ? "pausar" : "escuchar"} el audio original
              </p>
            </div>
            {!existingAudioUrl && (
              <Button
                type="button"
                onClick={clearRecording}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
