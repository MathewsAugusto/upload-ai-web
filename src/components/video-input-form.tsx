import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";


type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'
const statusMenssages = {
  converting: 'Convertendo...',
  uploading: 'Carregando...',
  generating: 'transcrevendo...',
  success: 'success✅'

}

interface VideoInputFormProps{
  onVideoUpload: (id: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null); //GENERIC PARA PASSAR TIPAGEM DO STADO
  const [status, setStatus] = useState<Status>('waiting');

 
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget; // RETORNA O FILES COMO ARRAY

    if (!files) {
      return;
    }

    const selectedFile = files[0];

    setVideoFile(selectedFile);
  }

  async function convertVideoToAudio(video: File) {
    console.log("Convert Started.");

    const ffmpeg = await getFFmpeg();

    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    /*   ffmpeg.on("log", (log) => {
      console.log(log);
    }); */

    ffmpeg.on("progress", (progress) => {
      console.log("Convert progress: " + Math.round(progress.progress * 100));
    });

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    const data = await ffmpeg.readFile("output.mp3");

    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert finish");

    return audioFile;
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = promptInputRef.current?.value
    if (!videoFile) {
      return
    }

    setStatus('converting')
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append("file", audioFile)

    setStatus('uploading')
    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')
    await api.post(`/videos/${videoId}/transcription`, {
      prompt
    })

    setStatus('success')

    props.onVideoUpload(videoId)

  }

  const previewURL = useMemo(() => { //monitora certas variaveis
    if (!videoFile) {
      return null;
    }

    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="poiter-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Carregar Video
          </>
        )}
      </label>

      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelect}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="trans-prompt">Prompt de transcrição</Label>
        <Textarea
        disabled={status != 'waiting'}
          ref={promptInputRef}//Variavelque referencia o input para get value ou outras opções
          id="trans-prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no video separadas por vírgula (,)"
        />
      </div>

      <Button 
      data-success={status === 'success'}
      disabled={status != 'waiting'} 
      type="submit"
      className="w-full data-[success=true]:bg-emerald-400">
       {status === 'waiting' ? (
        <>
          Carregar vídeo
          <Upload className="w-4 h-4 ml-2"/>
       </> 
       ) : statusMenssages[status]}
      </Button>
    </form>
  );
}
