const { PrismaClient } = require("./node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.reservation.findMany({
    orderBy: { id: "desc" },
    take: 2,
    select: { customer_name: true, date: true, time: true, party_size: true }
  });
  console.log(JSON.stringify(res, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
