import { Message } from "discord.js";
import { joinVoiceChannel, EndBehaviorType, VoiceConnection } from "@discordjs/voice";
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { OpenAI } from "openai";
import { OPENAI_API_KEY } from "../config";
import prism from "prism-media";

export async function execute(message: Message, args: string[]): Promise<void> {
  // Проверяем, находится ли пользователь в голосовом канале
  const member = message.member;
  const voiceChannel = member.voice.channel;
  const guild = message.guild;
  if (!guild) {
    await message.reply("Команда доступна только на сервере.");
    return;
  }
  
  // Подключаемся к голосовому каналу
  const connection: VoiceConnection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });
  
  await message.reply("Начинаю запись вашего голоса...");
  
  // Получаем Opus-поток от Discord
  const opusStream = connection.receiver.subscribe(member.id, {
    end: { behavior: EndBehaviorType.AfterSilence, duration: 2000 }
  });
  
  // Используем prism-media для декодирования Opus в PCM (16-bit little-endian, 48 kHz, 2 канала)
  const decoder = new prism.opus.Decoder({
    frameSize: 960, // стандартное значение
    channels: 2,
    rate: 48000,
  });
  
  const pcmStream = opusStream.pipe(decoder);
  
  // Создаем временный файл для записи
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, `recording-${Date.now()}.wav`);
  const output = fs.createWriteStream(filePath);
  
  // Запускаем ffmpeg для конвертации PCM потока в WAV с параметрами: 
  // входной формат: s16le, 48000 Гц, 2 канала;
  // выход: 16000 Гц, 1 канал, формат WAV.
  const ffmpeg = spawn("ffmpeg", [
    "-loglevel", "error",  // вывод ошибок
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "-i", "pipe:0",
    "-ar", "16000",
    "-ac", "1",
    "-f", "wav",
    "pipe:1"
  ]);
  
  // Передаем PCM поток в ffmpeg.stdin, а его stdout пишем в файл
  pcmStream.pipe(ffmpeg.stdin);
  ffmpeg.stdout.pipe(output);
  
  // Обработчик ошибок ffmpeg
  ffmpeg.stderr.on("data", (data) => {
    console.error("ffmpeg error:", data.toString());
  });
  
  // Обработчик события завершения входного потока
  opusStream.on("end", () => {
    console.log("Opus-поток завершён, завершаю ввод для ffmpeg.");
    ffmpeg.stdin.end();
  });
  
  // Устанавливаем максимальное время записи, например, 15 секунд (на случай, если событие тишины не сработает)
  const maxRecordingTime = 15000; // 15 секунд
  const timeout = setTimeout(() => {
    console.log("Принудительное завершение записи по таймауту");
    ffmpeg.stdin.end();
    connection.destroy();
  }, maxRecordingTime);
  
  // Ждем завершения процесса ffmpeg
  const recordingPromise = new Promise<void>((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg завершился с кодом ${code}`));
      }
    });
    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
  
  try {
    await recordingPromise;
    // Отключаемся от голосового канала
    if (connection.state.status !== "destroyed") {
      connection.destroy();
    }
    await message.reply("Запись завершена. Расшифровываю запись...");
    
    // Инициализируем OpenAI для транскрипции (Whisper)
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    
    const fileStream = fs.createReadStream(filePath);
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1"
    });
    const transcriptionText = transcriptionResponse;
    await message.reply(`Результат транскрипции:\n${transcriptionText}`);
  } catch (err) {
    console.error(err);
    await message.reply("Ошибка при записи или транскрипции аудио.");
  } finally {
    // Удаляем временный файл
    fs.unlink(filePath, (err) => {
      if (err) console.error("Ошибка при удалении файла", filePath, err);
    });
  }
}
