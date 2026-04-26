import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';
import { getSubtitles } from 'youtube-captions-scraper';

// DİKKAT: GROQ_API_KEY environment variable olarak ayarlanmalıdır
// Örnek: $env:GROQ_API_KEY="gsk_..." (Windows PowerShell)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function processVideo(videoUrl) {
  try {
    const videoId = new URL(videoUrl).searchParams.get('v');
    if (!videoId) throw new Error('Geçersiz YouTube URL');

    console.log(`🎬 Altyazılar çekiliyor: ${videoId}...`);
    const captions = await getSubtitles({
      videoID: videoId,
      lang: 'en' // İngilizce altyazıları çek
    });

    const transcriptText = captions
      .map(c => `[${c.start}-${parseFloat(c.start) + parseFloat(c.dur)}] ${c.text}`)
      .join('\n');

    console.log('🤖 AI analizi başlıyor (Groq)...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Sen bir dil öğrenme uzmanısın. Sana zaman damgalı İngilizce altyazılar vereceğim. 
          Bu altyazılardan İngilizce öğrenenler için en uygun, anlamlı ve 5-15 saniye arası süren 3-5 tane kesit seç.
          Her kesit için doğru bir Türkçe çeviri ve mantıklı ama yanlış bir çeldirici seçenek oluştur.
          ÇIKTI FORMATI: Sadece saf bir JSON array döndür. Örn: 
          [{"startTime": 33.5, "endTime": 39.2, "script": "Hello world", "options": [{"text": "Merhaba dünya", "isCorrect": true}, {"text": "Güle güle dünya", "isCorrect": false}]}]`
        },
        {
          role: 'user',
          content: `İşte altyazılar:\n${transcriptText}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);
    // Bazı modeller JSON object içinde bir key altında array döndürebilir, bunu kontrol et
    const newVideos = Array.isArray(aiResponse) ? aiResponse : (aiResponse.videos || aiResponse.data || Object.values(aiResponse)[0]);

    if (!Array.isArray(newVideos)) {
      throw new Error('AI geçersiz bir format döndürdü.');
    }

    // Video URL'sini ekle (Direkt video linki gerekeceği için YouTube embed linki veya direkt mp4 linki lazım)
    // Sitenin video player'ı direct mp4 bekliyor, bu yüzden kullanıcıya uyarı verelim.
    const finalVideos = newVideos.map((v, index) => ({
      ...v,
      id: Date.now() + index,
      url: videoUrl // Not: YouTube URL'leri direkt video player'da (video tag) çalışmaz. 
                     // Bunun için youtube-dl veya benzeri bir çözüm ya da embed player lazım.
    }));

    updateVideosFile(finalVideos);
    console.log('✅ İşlem başarıyla tamamlandı! src/data/videos.js güncellendi.');

  } catch (error) {
    console.error('❌ Hata oluştu:', error.message);
  }
}

function updateVideosFile(newEntries) {
  const filePath = path.resolve('src/data/videos.js');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Mevcut diziyi bul ve yeni elemanları ekle
  const arrayStart = content.indexOf('[');
  const arrayEnd = content.lastIndexOf(']');
  
  const currentArray = JSON.parse(content.substring(arrayStart, arrayEnd + 1));
  const updatedArray = [...currentArray, ...newEntries];
  
  const newContent = `export const videos = ${JSON.stringify(updatedArray, null, 2)};\n`;
  fs.writeFileSync(filePath, newContent);
}

// Kullanım örneği: node scripts/processor.js https://www.youtube.com/watch?v=VIDEO_ID
const url = process.argv[2];
if (url) {
  processVideo(url);
} else {
  console.log('Lütfen bir YouTube linki verin: node scripts/processor.js <link>');
}
