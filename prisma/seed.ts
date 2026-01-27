import { PrismaClient, SystemRole, LocationRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seeding)...');

  // 1. Tạo Mật khẩu hash chung
  const password = await bcrypt.hash('123456aA@', 10);

  // 2. Tạo 2 Kho (Locations)
  // Dùng upsert để nếu chạy lại seed nhiều lần không bị lỗi trùng lặp
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

  console.log('✅ Đã tạo 2 kho: Hà Nội & HCM');

  // 3. Tạo User: OWNER (Trùm cuối)
  // Owner mặc định có quyền MANAGER ở tất cả các kho để test cho dễ
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      email: 'owner@example.com',
      password,
      fullName: 'Ông Chủ',
      systemRole: SystemRole.OWNER,
      locations: {
        create: [
          { locationId: khoHN.id, role: LocationRole.MANAGER },
          { locationId: khoHCM.id, role: LocationRole.MANAGER },
        ],
      },
    },
  });

  // 4. Tạo User: ADMIN (Quản trị hệ thống)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password,
      fullName: 'Admin Hệ Thống',
      systemRole: SystemRole.ADMIN,
      locations: {
        create: [
          { locationId: khoHN.id, role: LocationRole.MANAGER }, // Admin cũng quản lý kho HN
        ],
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
      systemRole: SystemRole.STAFF, // Role hệ thống là Staff
      locations: {
        create: { locationId: khoHN.id, role: LocationRole.MANAGER },
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
      systemRole: SystemRole.STAFF,
      locations: {
        create: { locationId: khoHN.id, role: LocationRole.WAREHOUSE_STAFF },
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
      systemRole: SystemRole.STAFF,
      locations: {
        create: { locationId: khoHN.id, role: LocationRole.SALESPERSON },
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
      systemRole: SystemRole.STAFF,
      locations: {
        create: { locationId: khoHCM.id, role: LocationRole.MANAGER },
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
      systemRole: SystemRole.STAFF,
      locations: {
        create: { locationId: khoHCM.id, role: LocationRole.WAREHOUSE_STAFF },
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
