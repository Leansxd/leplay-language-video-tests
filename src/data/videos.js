export const videos = [
  {
    id: 1,
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    startTime: 55,
    endTime: 62,
    options: [
      { text: "Burada neler olduğunu bana anlatmalısın", isCorrect: true },
      { text: "Nereye gittiğini bana söylemelisin", isCorrect: false }
    ],
    script: "You have to tell me what's going on here."
  },
  {
    id: 2,
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    startTime: 0,
    endTime: 8,
    options: [
      { text: "Hayat bir yolculuktur, tadını çıkar", isCorrect: false },
      { text: "Yeni maceralara hazır mısınız?", isCorrect: true }
    ],
    script: "Are you ready for new adventures?"
  },
  {
    id: 3,
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    startTime: 0,
    endTime: 10,
    options: [
      { text: "Bu şimdiye kadarki en iyi sürüş", isCorrect: true },
      { text: "Araba sürmeyi çok seviyorum", isCorrect: false }
    ],
    script: "This is the best ride ever."
  },
  {
    id: 4,
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackAds.mp4",
    startTime: 15,
    endTime: 23,
    options: [
      { text: "Güvenliğiniz bizim önceliğimizdir", isCorrect: true },
      { text: "Bu araba çok hızlı gidiyor", isCorrect: false }
    ],
    script: "Your safety is our priority."
  }
];
