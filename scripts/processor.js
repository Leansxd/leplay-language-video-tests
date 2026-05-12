import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { YoutubeTranscript } from 'youtube-transcript';
import translate from 'translate-google';
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


    const lines = captions.slice(0, 400).map((c, i) => ({
      i,
      start: parseFloat((c.offset / 1000).toFixed(2)),
      end: parseFloat(((c.offset + c.duration) / 1000).toFixed(2)),
      text: c.text.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim(),
    }));


    const third = Math.floor(lines.length / 3);
    const sections = [
      { label: 'BAŞLANGIÇ (0-%33)', lines: lines.slice(0, third) },
      { label: 'ORTA (%33-%66)',      lines: lines.slice(third, third * 2) },
      { label: 'SON (%66-%100)',       lines: lines.slice(third * 2) },
    ];

    const transcriptText = sections.map(s =>
      `=== ${s.label} ===\n` +
      s.lines.map(l => `[${l.i}] ${l.start}s-${l.end}s: ${l.text}`).join('\n')
    ).join('\n\n');

    console.log('🤖 AI Aşama 1: Sahneler seçiliyor...');


    const selectionCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sen bir kurgucusun. Altyazılardan dil öğrenimi için 3-4 anlamlı kesit seç.

KESİN KURALLAR:
1. Sahneler ÇOK KISA olmalı. Sadece 1 veya en fazla 2 cümleden oluşsun (ideal olarak 2-6 saniye).
2. Uzun paragrafları, karmaşık tiradları SEÇME. Öğrenmesi kolay, akılda kalıcı kısa cümleler seç.
3. [Music], [Applause] gibi ses efektlerini içeren satırları ASLA seçme.
4. startLine ve endLine birbirine çok yakın olsun (örn: 0 ve 0, veya en fazla 0 ve 1).

SADECE JSON döndür. Format: {"clips": [{"startLine": 0, "endLine": 1}]}`
        },
        { role: 'user', content: transcriptText }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const selectionResponse = JSON.parse(selectionCompletion.choices[0].message.content);
    const selectedClips = selectionResponse.clips || [];
    if (selectedClips.length === 0) throw new Error('AI uygun kesit seçemedi.');

    const finalVideos = [];


    for (let i = 0; i < selectedClips.length; i++) {
      const clip = selectedClips[i];
      const startLine = lines[clip.startLine];
      const endLine = lines[Math.min(clip.endLine, lines.length - 1)];

      if (!startLine || !endLine) continue;


      const script = lines.slice(clip.startLine, clip.endLine + 1)
        .map(l => l.text.replace(/\n/g, ' ').trim())
        .join(' ')
        .replace(/\s+/g, ' ');
      
      console.log(`\n⏳ İşleniyor [${startLine.start}s]: "${script.substring(0, 40)}..."`);
      

      const translationCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Sen dünyanın en iyi film çevirmenisin. HBO veya Netflix kalitesinde çeviri yapıyorsun.
GÖREV: Verilen kısa İngilizce metni mükemmel, doğal ve deyimlere uygun şekilde Türkçeye çevir. Ve bir adet şaşırtıcı yanlış seçenek üret.

KESİN KURALLAR:
1. Metnin TAMAMINI çevir. Cümle atlama.
2. "correct" seçeneği, metnin doğal dublaj çevirisidir (Google çevirisi gibi robotik olmasın, bağlama göre deyimsel olsun).
3. "wrong" seçeneği, doğruya çok benzeyen ama anlamı tamamen bozan (ufak bir kelimesi değişmiş) versiyondur.
4. ASLA açıklama yapma. Sadece çeviriyi yaz.

SADECE JSON döndür.
Format: {"correct": "Mükemmel doğal çeviri.", "wrong": "Tuzak bozuk çeviri."}`
          },
          {
            role: 'user',
            content: `İngilizce Metin: "${script}"`
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      let transData;
      try {
        transData = JSON.parse(translationCompletion.choices[0].message.content);
      } catch (e) {
        console.error('Çeviri JSON hatası:', e);
        continue;
      }

      const correctTranslation = transData.correct;
      const wrongTranslation = transData.wrong;

      console.log(`  ✓ Doğru: ${correctTranslation}`);
      console.log(`  ✗ Yanlış: ${wrongTranslation}`);


      const options = [
        { text: correctTranslation, isCorrect: true },
        { text: wrongTranslation, isCorrect: false }
      ].sort(() => Math.random() - 0.5);

      finalVideos.push({
        startTime: startLine.start,
        endTime: endLine.end,
        script,
        options,
        id: Date.now() + i,
        url: videoUrl,
      });
    }

    if (finalVideos.length === 0) throw new Error('Hiç geçerli kesit oluşturulamadı.');

    updateVideosFile(finalVideos);
    console.log(`\n🎉 Başarılı! ${finalVideos.length} video eklendi.`);

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
