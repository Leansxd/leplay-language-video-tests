import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { YoutubeTranscript } from 'youtube-transcript';
import 'dotenv/config';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function processVideo(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) throw new Error('Geçersiz YouTube URL.');

    console.log(`🎬 Video ID: ${videoId}`);
    console.log(`🔍 Altyazılar çekiliyor (Otomatik altyazılar dahil)...`);
    
    const captions = await YoutubeTranscript.fetchTranscript(videoId);

    if (!captions || captions.length === 0) {
      throw new Error('Bu videoda altyazı bulunamadı.');
    }

    console.log(`✅ ${captions.length} satır altyazı başarıyla çekildi.`);

    // Transcripti AI'nın anlayacağı formata sok
    const transcriptText = captions
      .slice(0, 150) // Biraz daha fazla satır alalım
      .map(c => `[${(c.offset / 1000).toFixed(2)}-${((c.offset + c.duration) / 1000).toFixed(2)}] ${c.text}`)
      .join('\n');

    console.log('🤖 AI Analizi başlıyor (Groq)...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sen deneyimli bir İngilizce dil öğretmenisin. Sana bir videonun zaman damgalı altyazıları verilecek.

GÖREV: Bu altyazılardan dil öğrenmek için EN KALİTELİ 3-4 kesiti seç ve bunları JSON formatında döndür.

KESIT SEÇME KRİTERLERİ (hepsini mutlaka uygula):
1. Kesit en az 2, en fazla 4 kelimeden oluşan TAM ve ANLAMLI bir cümle veya cümle grubu olmalı.
2. Kesit, tek başına anlamlı olmalı (bağlamı olmadan da ne olduğu anlaşılmalı).
3. Müzik, ses efekti, "[Music]", "[Applause]" gibi altyazıları KESINLIKLE ALMA.
4. Yarım kalmış cümleleri ALMA. Örnek "because I was..." gibi başlangıçlar olmaz.
5. Yalnızca altyazıda GERÇEKTEN OLAN metni script olarak yaz. Asla uydurma.
6. startTime ve endTime, altyazıdaki zaman damgalarına birebir uysun.

ÇEVİRİ KRİTERLERİ:
1. Doğru çeviri (isCorrect: true) kesinlikle doğal Türkçe olsun, kelime kelime değil.
2. Yanlış çeviri (isCorrect: false) ZORLAYICI olsun:
   - Anlam bakımından çok yakın ama kritik bir fark içersin (örn. "gidiyorum" yerine "geliyorum")
   - Tamamen alakasız veya çok belli bir yanlış YAPMA ("uçuyorum" gibi saçma şeyler olmasın)
   - Kullanıcı dikkatlice dinlemeden ayırt edemeyeceği kadar yakın olsun

Zorunlu JSON Formatı: {"videos": [{"startTime": 0.0, "endTime": 0.0, "script": "Orijinal İngilizce cümle (HTML temizlenmiş)", "options": [{"text": "Doğal Türkçe çeviri", "isCorrect": true}, {"text": "Çok yakın ama yanlış çeviri", "isCorrect": false}]}]}`
        },
        {
          role: 'user',
          content: `Altyazılar:\n${transcriptText}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = chatCompletion.choices[0].message.content;
    let aiResponse = JSON.parse(content);
    const newVideos = aiResponse.videos || [];

    if (newVideos.length === 0) throw new Error('AI uygun bir kesit seçemedi.');

    const finalVideos = newVideos.map((v, index) => ({
      ...v,
      id: Date.now() + index,
      url: videoUrl
    }));

    updateVideosFile(finalVideos);
    console.log(`🎉 Başarılı! ${finalVideos.length} yeni video eklendi.`);

  } catch (error) {
    console.error('❌ HATA:', error.message);
  }
}

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function updateVideosFile(newEntries) {
  const filePath = path.resolve('src/data/videos.json');
  let currentArray = [];
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (fileContent.trim()) currentArray = JSON.parse(fileContent);
  }
  const updatedArray = [...currentArray, ...newEntries];
  fs.writeFileSync(filePath, JSON.stringify(updatedArray, null, 2));
}

const url = process.argv[2];
if (url) processVideo(url);
else console.log('Kullanım: node scripts/processor.js <youtube_url>');
