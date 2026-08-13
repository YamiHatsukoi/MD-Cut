/** Decodes the audio stream of a media file (audio OR video container) into
 * a small array of peak amplitudes (0..1), used to draw a waveform. Returns
 * null if the file has no decodable audio (e.g. a silent screen recording). */
export async function decodeWaveformPeaks(
  fileUrl: string,
  numPeaks = 400
): Promise<number[] | null> {
  try {
    const res = await fetch(fileUrl);
    const arrayBuffer = await res.arrayBuffer();
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } finally {
      ctx.close();
    }

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / numPeaks));
    const peaks: number[] = [];
    for (let i = 0; i < numPeaks; i++) {
      const start = i * blockSize;
      const end = Math.min(channelData.length, start + blockSize);
      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }
    return peaks;
  } catch {
    return null;
  }
}
