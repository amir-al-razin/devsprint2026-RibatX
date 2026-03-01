import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const menuItems = [
  { name: 'Chicken Biryani', quantity: 50, price: 180 },
  { name: 'Beef Curry with Rice', quantity: 40, price: 150 },
  { name: 'Vegetable Fried Rice', quantity: 35, price: 120 },
  { name: 'Chicken Burger', quantity: 30, price: 140 },
  { name: 'Beef Burger', quantity: 25, price: 160 },
  { name: 'Club Sandwich', quantity: 20, price: 130 },
  { name: 'Chicken Pizza (Medium)', quantity: 15, price: 350 },
  { name: 'Beef Pizza (Medium)', quantity: 12, price: 380 },
  { name: 'Pasta Carbonara', quantity: 18, price: 170 },
  { name: 'Chicken Noodles', quantity: 28, price: 140 },
  { name: 'Beef Noodles', quantity: 22, price: 160 },
  { name: 'Fish Fry with Rice', quantity: 15, price: 190 },
  { name: 'Chicken Shawarma', quantity: 25, price: 110 },
  { name: 'Beef Shawarma', quantity: 20, price: 130 },
  { name: 'Falafel Wrap', quantity: 18, price: 100 },
  { name: 'Chicken Wings (6 pcs)', quantity: 20, price: 180 },
  { name: 'French Fries', quantity: 40, price: 60 },
  { name: 'Onion Rings', quantity: 30, price: 70 },
  { name: 'Samosa (2 pcs)', quantity: 50, price: 40 },
  { name: 'Spring Roll (2 pcs)', quantity: 35, price: 50 },
  { name: 'Iftar Box Special', quantity: 30, price: 250 },
  { name: 'Haleem', quantity: 25, price: 120 },
  { name: 'Jilapi (250g)', quantity: 20, price: 80 },
  { name: 'Mango Juice', quantity: 45, price: 50 },
  { name: 'Orange Juice', quantity: 40, price: 50 },
  { name: 'Lemonade', quantity: 35, price: 40 },
  { name: 'Coca Cola', quantity: 60, price: 30 },
  { name: 'Sprite', quantity: 55, price: 30 },
  { name: 'Mineral Water', quantity: 100, price: 20 },
  { name: 'Tea', quantity: 80, price: 15 },
];

async function main() {
  console.log('🌱 Seeding stock database...');

  // Clear existing items
  await prisma.item.deleteMany();
  console.log('✅ Cleared existing items');

  // Create new items
  for (const item of menuItems) {
    await prisma.item.create({
      data: {
        name: item.name,
        quantity: item.quantity,
      },
    });
  }

  console.log(`✅ Created ${menuItems.length} menu items`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
