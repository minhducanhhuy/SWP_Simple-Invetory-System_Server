import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seeding)...');

  // 1. Tạo Mật khẩu hash chung (123456aA@)
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
      role: Role.ADMIN_SYSTEM,
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

  // =========================================================
  // 7. TẠO DANH MỤC & ĐƠN VỊ TÍNH (Category & Unit)
  // =========================================================
  console.log('🔄 Đang tạo Danh mục & Đơn vị tính...');

  const catDoUong = await prisma.category.create({
    data: { name: 'Đồ uống', description: 'Nước ngọt, bia, nước suối' },
  });

  const catDoAn = await prisma.category.create({
    data: { name: 'Đồ ăn nhanh', description: 'Mì gói, snack, bánh kẹo' },
  });

  const unitLon = await prisma.unit.create({
    data: { name: 'Lon' },
  });

  const unitGoi = await prisma.unit.create({
    data: { name: 'Gói' },
  });

  // =========================================================
  // 8. TẠO ĐỐI TÁC (Supplier & Customer)
  // =========================================================
  console.log('🔄 Đang tạo Nhà cung cấp & Khách hàng...');

  // Nhà cung cấp
  const supCoca = await prisma.supplier.create({
    data: {
      code: 'NCC-COCA',
      name: 'Coca Cola Việt Nam',
      email: 'contact@coca.vn',
      phone: '0909111222',
      address: 'Thủ Đức, HCM',
    },
  });

  const supAcecook = await prisma.supplier.create({
    data: {
      code: 'NCC-ACECOOK',
      name: 'Acecook Việt Nam',
      email: 'sales@acecook.vn',
      phone: '0909333444',
      address: 'Tân Bình, HCM',
    },
  });

  // Khách hàng
  const custLe = await prisma.customer.create({
    data: {
      code: 'KH-VANG-LAI',
      name: 'Khách Vãng Lai',
      phone: '0000000000',
      address: 'N/A',
    },
  });

  const custVip = await prisma.customer.create({
    data: {
      code: 'KH-001',
      name: 'Nguyễn Văn A (VIP)',
      phone: '0912345678',
      address: 'Hoàn Kiếm, Hà Nội',
    },
  });

  // =========================================================
  // 9. TẠO SẢN PHẨM (Product)
  // =========================================================
  console.log('🔄 Đang tạo Sản phẩm...');

  const prodCoke = await prisma.product.create({
    data: {
      sku: '893000123456',
      name: 'Coca Cola 330ml',
      categoryId: catDoUong.id,
      unitId: unitLon.id,
      costPrice: 8000, // Nhập 8k
      sellPrice: 10000, // Bán 10k
      minStockLevel: 20,
    },
  });

  const prodHaoHao = await prisma.product.create({
    data: {
      sku: '893000789012',
      name: 'Mì Hảo Hảo Tôm Chua Cay',
      categoryId: catDoAn.id,
      unitId: unitGoi.id,
      costPrice: 3500,
      sellPrice: 4500,
      minStockLevel: 50,
    },
  });

  //   // =========================================================
  //   // 10. TẠO TỒN KHO (InventoryItem)
  //   // =========================================================
  //   console.log('🔄 Đang set tồn kho ban đầu...');

  //   // Set tồn kho tại Kho HN
  //   await prisma.inventoryItem.createMany({
  //     data: [
  //       { locationId: khoHN.id, productId: prodCoke.id, quantity: 100 },
  //       { locationId: khoHN.id, productId: prodHaoHao.id, quantity: 200 },
  //     ],
  //   });

  //   // Set tồn kho tại Kho HCM
  //   await prisma.inventoryItem.createMany({
  //     data: [
  //       { locationId: khoHCM.id, productId: prodCoke.id, quantity: 50 }, // HCM ít hàng hơn
  //       { locationId: khoHCM.id, productId: prodHaoHao.id, quantity: 0 }, // Hết mì
  //     ],
  //   });

  //   // =========================================================
  //   // 11. TẠO GIAO DỊCH KHO (StockTicket & StockTransaction)
  //   // =========================================================
  //   console.log('🔄 Đang tạo Vé nhập/xuất kho...');

  //   // Lấy user Owner hoặc Admin để làm người tạo phiếu
  //   const adminUser = await prisma.user.findUnique({
  //     where: { username: 'admin' },
  //   });

  //   if (adminUser) {
  //     // 11.1 Tạo phiếu NHẬP HÀNG (IMPORT)
  //     await prisma.stockTicket.create({
  //       data: {
  //         code: 'PN-001',
  //         type: 'IMPORT',
  //         status: 'COMPLETED',
  //         note: 'Nhập hàng đầu tháng',
  //         creatorId: adminUser.id,
  //         destLocationId: khoHN.id, // Nhập vào kho HN
  //         details: {
  //           create: [
  //             {
  //               productId: prodCoke.id,
  //               quantity: 100,
  //               price: 8000, // Giá nhập khớp với product
  //             },
  //           ],
  //         },
  //       },
  //     });

  //     // 11.2 Tạo phiếu BÁN HÀNG (SELL)
  //     await prisma.stockTicket.create({
  //       data: {
  //         code: 'PX-001',
  //         type: 'SELL',
  //         status: 'COMPLETED',
  //         note: 'Bán cho khách VIP',
  //         creatorId: adminUser.id,
  //         sourceLocationId: khoHN.id, // Xuất từ kho HN
  //         customerId: custVip.id,
  //         details: {
  //           create: [
  //             {
  //               productId: prodCoke.id,
  //               quantity: 24, // 1 thùng
  //               price: 10000, // Giá bán
  //             },
  //             {
  //               productId: prodHaoHao.id,
  //               quantity: 10,
  //               price: 4500,
  //             },
  //           ],
  //         },
  //       },
  //     });
  //   }

  // =========================================================
  // 12. TẠO THANH TOÁN (SupplierPayment)
  // =========================================================
  //   console.log('🔄 Đang tạo phiếu chi tiền nhà cung cấp...');

  //   if (adminUser) {
  //      await prisma.supplierPayment.create({
  //        data: {
  //          code: 'PC-001',
  //          amount: 500000, // Trả trước 500k
  //          creatorId: adminUser.id,
  //          note: 'Thanh toán đợt 1 tiền nhập Coca',
  //        },
  //      });
  //   }

  // =========================================================
  // 13. TẠO USER INVITATION (Lời mời tham gia)
  // =========================================================
  console.log('🔄 Đang tạo lời mời nhân viên...');

  await prisma.userInvitation.create({
    data: {
      email: 'new.staff@example.com',
      token: 'invite-token-123456', // Giả lập token
      role: Role.STAFF,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Hết hạn sau 7 ngày
    },
  });

  console.log('✅ Đã tạo nhân viên chi tiết cho từng kho');
  console.log('🚀 Seeding hoàn tất! Mật khẩu chung là: 123456aA@');
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
