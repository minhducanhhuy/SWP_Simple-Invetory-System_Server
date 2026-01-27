import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seeding)...');

  // 1. Tạo Mật khẩu hash chung (123456)
  const password = await bcrypt.hash('123456aA@', 10);

  // 2. Tạo 2 Kho (Locations)
  const khoHN = await prisma.location.upsert({
    where: { code: 'KHO-HN' },
    update: {},
    create: {
      code: 'KHO-HN',
      name: 'Kho Hà Nội (Trụ sở chính)',
      address: '123 Cầu Giấy, Hà Nội',
    },
  });

  const khoHCM = await prisma.location.upsert({
    where: { code: 'KHO-HCM' },
    update: {},
    create: {
      code: 'KHO-HCM',
      name: 'Kho Hồ Chí Minh (Chi nhánh)',
      address: '456 Quận 1, TP.HCM',
    },
  });

  console.log(`✅ Đã tạo 2 kho: ${khoHN.name} & ${khoHCM.name}`);

  // 3. Tạo User: OWNER (Trùm cuối)
  // Logic cũ: Owner có quyền tối cao.
  // Logic mới: Role = OWNER. Vẫn gán vào cả 2 kho để tiện test các API có check locationId.
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      email: 'owner@example.com',
      password,
      fullName: 'Ông Chủ',
      role: Role.OWNER, // Role nằm trực tiếp ở User
      assignedLocations: {
        create: [
          { locationId: khoHN.id }, // Không cần field 'role' ở đây nữa
          { locationId: khoHCM.id },
        ],
      },
    },
  });

  // 4. Tạo User: ADMIN (Quản trị hệ thống)
  // Admin được gán vào kho HN để quản lý.
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password,
      fullName: 'Admin Hệ Thống',
      role: Role.ADMIN,
      assignedLocations: {
        create: [{ locationId: khoHN.id }],
      },
    },
  });

  console.log('✅ Đã tạo User cấp cao: Owner & Admin');

  // 5. Tạo Nhân viên cho Kho HÀ NỘI

  // Manager HN
  await prisma.user.upsert({
    where: { username: 'manager_hn' },
    update: {},
    create: {
      username: 'manager_hn',
      email: 'manager.hn@example.com',
      password,
      fullName: 'Trưởng Kho Hà Nội',
      role: Role.MANAGER, // Định danh là Quản lý
      assignedLocations: {
        create: { locationId: khoHN.id },
      },
    },
  });

  // Warehouse Staff HN (Thủ kho)
  await prisma.user.upsert({
    where: { username: 'warehouse_hn' },
    update: {},
    create: {
      username: 'warehouse_hn',
      email: 'kho.hn@example.com',
      password,
      fullName: 'Thủ Kho Hà Nội',
      role: Role.WAREHOUSE_STAFF, // Định danh là Thủ kho
      assignedLocations: {
        create: { locationId: khoHN.id },
      },
    },
  });

  // Salesperson HN (Nhân viên bán hàng)
  await prisma.user.upsert({
    where: { username: 'sales_hn' },
    update: {},
    create: {
      username: 'sales_hn',
      email: 'sales.hn@example.com',
      password,
      fullName: 'Sale Hà Nội',
      role: Role.SALESPERSON,
      assignedLocations: {
        create: { locationId: khoHN.id },
      },
    },
  });

  // 6. Tạo Nhân viên cho Kho HỒ CHÍ MINH

  // Manager HCM
  await prisma.user.upsert({
    where: { username: 'manager_hcm' },
    update: {},
    create: {
      username: 'manager_hcm',
      email: 'manager.hcm@example.com',
      password,
      fullName: 'Trưởng Kho HCM',
      role: Role.MANAGER,
      assignedLocations: {
        create: { locationId: khoHCM.id },
      },
    },
  });

  // Warehouse Staff HCM
  await prisma.user.upsert({
    where: { username: 'warehouse_hcm' },
    update: {},
    create: {
      username: 'warehouse_hcm',
      email: 'kho.hcm@example.com',
      password,
      fullName: 'Thủ Kho HCM',
      role: Role.WAREHOUSE_STAFF,
      assignedLocations: {
        create: { locationId: khoHCM.id },
      },
    },
  });

  console.log('✅ Đã tạo nhân viên chi tiết cho từng kho');
  console.log('🚀 Seeding hoàn tất! Mật khẩu chung là: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
