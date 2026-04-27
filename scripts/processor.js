import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { YoutubeTranscript } from 'youtube-transcript';
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function extractVideoId(url) {
  const m = url.match(/^.*(youtu\.be\/|v\/|watch\?v=|&v=)([^#&?]*).*/);
  return (m && m[2].length === 11) ? m[2] : null;
}

async function processVideo(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error('Geçersiz YouTube URL.');

    console.log(`🎬 Video ID: ${videoId}`);
    console.log(`🔍 Altyazılar çekiliyor...`);

    const captions = await YoutubeTranscript.fetchTranscript(videoId);
    if (!captions || captions.length === 0) throw new Error('Bu videoda altyazı bulunamadı.');

    console.log(`✅ ${captions.length} satır altyazı çekildi.`);

    // Her satıra index ver, sadece ilk 150 satırı al
    const lines = captions.slice(0, 150).map((c, i) => ({
      i,
      start: parseFloat((c.offset / 1000).toFixed(2)),
      end: parseFloat(((c.offset + c.duration) / 1000).toFixed(2)),
      text: c.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim(),
    }));

    // Transcript'i bölümlere ayır
    const third = Math.floor(lines.length / 3);
    const sections = [
      { label: 'BAŞLANGIÇ', lines: lines.slice(0, third) },
      { label: 'ORTA',      lines: lines.slice(third, third * 2) },
      { label: 'SON',       lines: lines.slice(third * 2) },
    ];

    const transcriptText = sections.map(s =>
      `=== ${s.label} ===\n` +
      s.lines.map(l => `[${l.i}] ${l.start}s-${l.end}s: ${l.text}`).join('\n')
    ).join('\n\n');

    console.log('🤖 AI analizi başlıyor...');

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sen İngilizce öğretmenisin. Sana numaralı altyazı satırları veriyorum.

GÖREV: Her bölümden (BAŞLANGIÇ, ORTA, SON) en az 1 tane olmak üzere toplam 3-4 kesit seç.

SEÇIM KURALLARI:
1. Seçtiğin kesit birbirini takip eden 1-4 satırdan oluşsun.
2. Satırlar birleşince tam ve anlamlı bir İngilizce cümle oluşturmalı.
3. [Music], [Applause] içeren satırları ALMA.
4. Yarım cümle ALMA.
5. Her iki kesit arasında en az 25 saniye olmalı.

ÇIKTI: Sadece JSON döndür. "startLine" ve "endLine" seçtiğin satırların INDEX numarasıdır ([i] kısmı).

Zorunlu JSON Formatı:
{"clips": [{"startLine": 0, "endLine": 2, "options": [{"text": "Doğal Türkçe çeviri", "isCorrect": true}, {"text": "Çok yakın ama yanlış çeviri", "isCorrect": false}]}]}`
        },
        {
          role: 'user',
          content: transcriptText
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    const clips = aiResponse.clips || [];
    if (clips.length === 0) throw new Error('AI uygun kesit seçemedi.');

    // Index'leri gerçek zaman damgalarına çevir
    const finalVideos = clips.map((clip, idx) => {
      const startLine = lines[clip.startLine];
      const endLine = lines[Math.min(clip.endLine, lines.length - 1)];

      if (!startLine || !endLine) {
        console.log(`  ⚠ Geçersiz index: ${clip.startLine}-${clip.endLine}, atlanıyor.`);
        return null;
      }

      const script = lines
        .slice(clip.startLine, clip.endLine + 1)
        .map(l => l.text)
        .join(' ');

      console.log(`  ✓ [${startLine.start}s-${endLine.end}s] "${script.substring(0, 50)}..."`);

      return {
        startTime: startLine.start,
        endTime: endLine.end,
        script,
        options: clip.options,
        id: Date.now() + idx,
        url: videoUrl,
      };
    }).filter(Boolean);

    if (finalVideos.length === 0) throw new Error('Hiç geçerli kesit oluşturulamadı.');

    updateVideosFile(finalVideos);
    console.log(`🎉 Başarılı! ${finalVideos.length} video eklendi.`);

  } catch (err) {
    console.error('❌ HATA:', err.message);
  }
}

function updateVideosFile(newEntries) {
  const filePath = path.resolve('src/data/videos.json');
  let current = [];
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (raw) current = JSON.parse(raw);
  }
  fs.writeFileSync(filePath, JSON.stringify([...current, ...newEntries], null, 2));
}

const url = process.argv[2];
if (url) processVideo(url);
else console.log('Kullanım: node scripts/processor.js <youtube_url>');
