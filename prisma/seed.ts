import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Tạo hash password cho admin (ví dụ mk là: admin123)
  const saltOrRounds = 10;
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD!,
    saltOrRounds,
  );

  // 2. Thực hiện lệnh upsert (Update hoặc Insert)
  const admin = await prisma.user.upsert({
    // Điều kiện tìm kiếm: Tìm user có username là 'admin'
    where: { username: 'admin' },

    // Nếu tìm thấy: Không làm gì cả (update rỗng)
    update: {},

    // Nếu KHÔNG tìm thấy: Tạo mới user này
    create: {
      username: process.env.ADMIN_USERNAME!,
      email: 'admin@inventory.com',
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN, // Set quyền cao nhất
    },
  });

  console.log({ admin });
}

// Boilerplate để chạy hàm main và ngắt kết nối khi xong
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
