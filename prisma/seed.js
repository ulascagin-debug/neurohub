const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create Fookah Founge business (matches cafe-chatbot's existing setup)
  const business = await prisma.business.create({
    data: {
      name: 'Fookah Founge',
      location: 'Kadıköy, İstanbul',
      is_verified: true,
    },
  })
  console.log('✅ Business created:', business.name, '→ ID:', business.id)

  // Create chatbot config matching cafe-chatbot's menu_data.py
  await prisma.chatbotConfig.create({
    data: {
      business_id: business.id,
      tone: 'friendly',
      table_count: 15,
      address: 'Kadıköy, İstanbul',
      phone: '+90 555 123 4567',
      campaigns: 'Hafta içi öğle menüsü %20 indirimli\nHer Cuma canlı müzik',
      working_hours: JSON.stringify({
        "Pazartesi": "11:00-23:00",
        "Salı": "11:00-23:00",
        "Çarşamba": "11:00-23:00",
        "Perşembe": "11:00-23:00",
        "Cuma": "11:00-01:00",
        "Cumartesi": "11:00-01:00",
        "Pazar": "12:00-22:00"
      }),
      menu: JSON.stringify({
        "Burger Menu": {
          "Klasik Burger": 180,
          "Cheeseburger": 195,
          "Double Burger": 230,
          "Tavuk Burger": 175,
          "Vegan Burger": 210
        },
        "Yan Ürünler": {
          "Patates Kızartması": 90,
          "Baharatlı Patates": 95,
          "Soğan Halkası": 100,
          "Mozzarella Stick": 120
        },
        "İçecekler": {
          "Kola": 60,
          "Fanta": 60,
          "Sprite": 60,
          "Ayran": 45,
          "Soğuk Çay": 65,
          "Su": 25
        },
        "Tatlılar": {
          "Çikolatalı Brownie": 110,
          "Cheesecake": 120,
          "Sufle": 115,
          "Dondurma (3 top)": 90
        }
      }),
    },
  })
  console.log('✅ ChatbotConfig created')

  // Create integration config for Instagram (matches cafe-chatbot .env INSTAGRAM_PAGE_ID)
  await prisma.integrationConfig.create({
    data: {
      business_id: business.id,
      platform: 'instagram',
      platform_identifier: '26127995610189827',
      access_token: 'IGAAbLa4qDVvhBZAGFjZAHNjbldQWXhUSEtHOENDak5TcHg3bEZASMkREQjZAaWFR1d2kzVHhRbklZAdDJlcWlhQnRnVEx2emhueUNPRmYtVW5USWExUWRGTGczVTNicVVsSENqZA1cxNkUybHFHQURhZAnFIaHlSNXNBN2VHV2t2N3ZAqbwZDZD',
    },
  })
  console.log('✅ Instagram IntegrationConfig created')

  // Create some sample messages (simulating chatbot conversations)
  const sampleMessages = [
    { platform: 'instagram', content: 'Merhaba, bugün açık mısınız?', response: 'Merhaba! Evet, bugün 11:00-23:00 arası hizmetinizdeyiz.', user_id: 'ig_user_001' },
    { platform: 'instagram', content: 'Menünüzü görebilir miyim?', response: 'Tabii! Burger menümüzde Klasik Burger 180₺, Cheeseburger 195₺, Double Burger 230₺ bulunuyor.', user_id: 'ig_user_001' },
    { platform: 'whatsapp', content: '4 kişilik masa ayırtmak istiyorum', response: 'Tabii, hangi tarih ve saat uygun olur?', user_id: '+905551234567' },
    { platform: 'whatsapp', content: 'Yarın akşam 20:00', response: 'İsminizi alabilir miyim?', user_id: '+905551234567' },
    { platform: 'whatsapp', content: 'Ali Yılmaz', response: 'Rezervasyonunuz onaylandı!\n\nİsim: Ali Yılmaz\nTarih: 26.03.2026\nSaat: 20:00\nKişi: 4 kişi\n\nSizi bekliyoruz!', user_id: '+905551234567' },
    { platform: 'instagram', content: 'Vegan seçeneğiniz var mı?', response: 'Evet, Vegan Burger seçeneğimiz 210₺.', user_id: 'ig_user_002' },
    { platform: 'instagram', content: 'Paket servis yapıyor musunuz?', response: 'Şu an paket servis hizmetimiz bulunmuyor, ama mekanımızda sizi ağırlamaktan mutluluk duyarız.', user_id: 'ig_user_003' },
    { platform: 'whatsapp', content: 'Çocuk menüsü var mı?', response: 'Maalesef özel bir çocuk menümüz yok, ancak Tavuk Burger ve patates kızartması çocuklara uygun seçenekler.', user_id: '+905559876543' },
  ]

  for (const msg of sampleMessages) {
    await prisma.message.create({
      data: { business_id: business.id, ...msg },
    })
  }
  console.log('✅ Sample messages created:', sampleMessages.length)

  // Create sample reservations
  const sampleReservations = [
    { customer_name: 'Ali Yılmaz', date: '2026-03-26', time: '20:00', party_size: 4 },
    { customer_name: 'Ayşe Demir', date: '2026-03-25', time: '19:00', party_size: 2 },
    { customer_name: 'Mehmet Kaya', date: '2026-03-27', time: '21:00', party_size: 6 },
    { customer_name: 'Elif Çelik', date: '2026-03-28', time: '18:30', party_size: 3 },
    { customer_name: 'Can Özkan', date: '2026-03-28', time: '20:30', party_size: 5 },
  ]

  for (const res of sampleReservations) {
    await prisma.reservation.create({
      data: { business_id: business.id, ...res },
    })
  }
  console.log('✅ Sample reservations created:', sampleReservations.length)

  console.log('\n🎉 Seed completed!')
  console.log(`📋 Fookah Founge business_id: ${business.id}`)
  console.log('👉 Set this in cafe-chatbot/.env → DEV_BUSINESS_ID=' + business.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
