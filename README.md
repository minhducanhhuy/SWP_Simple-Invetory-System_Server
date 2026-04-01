## Hướng dẫn cài đặt

Để cài đặt và chạy dự án backend này trên môi trường local của bạn, hãy làm theo các bước sau:

### 1. Yêu cầu hệ thống

Đảm bảo bạn đã cài đặt các phần mềm sau:

- **Node.js** (phiên bản 18 trở lên)
- **npm** (hoặc yarn)
- **PostgreSQL** database server
- **Git**

### 2. Thiết lập môi trường local

1.  **Clone repository:**

    ```bash
    git clone <URL_CỦA_REPOSITORY_BACKEND>
    cd Simple_Inventory_Management/server
    ```

    _(Thay `<URL_CỦA_REPOSITORY_BACKEND>` bằng URL thực tế của repository backend của bạn.)_

2.  **Cài đặt các dependencies:**
    Sử dụng npm để cài đặt tất cả các gói cần thiết:

    ```bash
    npm install
    ```

3.  **Cấu hình biến môi trường (`.env`)**:
    - Tạo một file có tên `.env` ở thư mục gốc của dự án (`Simple_Inventory_Management/server`).
    - Thêm các biến môi trường sau vào file `.env` của bạn và điều chỉnh giá trị cho phù hợp với môi trường local của bạn:

      ```dotenv
      PORT=3035
      DATABASE_URL="postgresql://user:password@localhost:5432/simple_inventory_db?schema=public"
      JWT_SECRET=your_jwt_secret_key # Thay đổi bằng một chuỗi mạnh
      JWT_EXPIRATION_TIME=3600s
      REFRESH_TOKEN_SECRET=your_refresh_token_secret_key # Thay đổi bằng một chuỗi mạnh
      REFRESH_TOKEN_EXPIRATION_TIME=7d
      EMAIL_HOST=smtp.example.com
      EMAIL_PORT=587
      EMAIL_USER=your_email@example.com
      EMAIL_PASS=your_email_password
      FRONTEND_URL=http://localhost:3000 # Hoặc domain frontend của bạn
      ```

    - **Lưu ý:**
      - `DATABASE_URL`: Đảm bảo rằng bạn đã tạo một cơ sở dữ liệu PostgreSQL và cập nhật chuỗi kết nối phù hợp.
      - `JWT_SECRET` và `REFRESH_TOKEN_SECRET`: Sử dụng các chuỗi bí mật mạnh và duy nhất.
      - Cấu hình email nếu bạn muốn sử dụng tính năng gửi email.

4.  **Chạy Prisma Migrations và Seed dữ liệu:**
    Sau khi cấu hình `DATABASE_URL`, bạn cần áp dụng các migration và seed dữ liệu ban đầu cho cơ sở dữ liệu của mình:

    ```bash
    npx prisma migrate dev --name init
    npx prisma db seed
    ```

5.  **Chạy ứng dụng:**
    Khởi động máy chủ phát triển cục bộ:

    ```bash
    npm run start:dev
    ```

    Ứng dụng sẽ chạy tại `http://localhost:3035` (hoặc cổng bạn đã cấu hình trong `.env`).

6.  **Build cho Production:**
    Để build ứng dụng sẵn sàng cho môi trường production:
    ```bash
    npm run build
    npm run start:prod
    ```
    Các file đã được build sẽ nằm trong thư mục `dist/`.

## API Endpoints chính

Ứng dụng backend này cung cấp một bộ API RESTful toàn diện để quản lý kho hàng. Tất cả các endpoint đều có tiền tố `/api`. Dưới đây là một số endpoint chính:

- **Xác thực & Người dùng (`/api/auth`, `/api/users`)**
  - `POST /api/auth/register`: Đăng ký người dùng mới (chỉ ADMIN/OWNER).
  - `POST /api/auth/login`: Đăng nhập và nhận JWT.
  - `POST /api/auth/refresh`: Làm mới JWT bằng refresh token.
  - `POST /api/auth/logout`: Đăng xuất.
  - `GET /api/users/profile`: Lấy thông tin profile của người dùng hiện tại.
  - `PATCH /api/users/profile`: Cập nhật thông tin profile của người dùng hiện tại.
  - `GET /api/users`: Lấy danh sách tất cả người dùng (yêu cầu quyền).
  - `GET /api/users/:id`: Lấy thông tin chi tiết người dùng theo ID (yêu cầu quyền).

- **Sản phẩm (`/api/products`)**
  - `GET /api/products`: Lấy danh sách tất cả sản phẩm.
  - `GET /api/products/:id`: Lấy thông tin sản phẩm theo ID.
  - `POST /api/products`: Tạo sản phẩm mới.
  - `PATCH /api/products/:id`: Cập nhật thông tin sản phẩm.
  - `DELETE /api/products/:id`: Xóa sản phẩm.

- **Địa điểm/Kho hàng (`/api/locations`)**
  - `GET /api/locations`: Lấy danh sách tất cả địa điểm/kho hàng.
  - `POST /api/locations`: Tạo địa điểm/kho hàng mới.

- **Phiếu nhập/xuất kho (`/api/stock-tickets`)**
  - `GET /api/stock-tickets`: Lấy danh sách tất cả phiếu nhập/xuất kho.
  - `POST /api/stock-tickets/import`: Tạo phiếu nhập kho.
  - `POST /api/stock-tickets/export`: Tạo phiếu xuất kho.

- **Khách hàng (`/api/customers`)**
  - `GET /api/customers`: Lấy danh sách tất cả khách hàng.
  - `POST /api/customers`: Tạo khách hàng mới.

- **Nhà cung cấp (`/api/suppliers`)**
  - `GET /api/suppliers`: Lấy danh sách tất cả nhà cung cấp.
  - `POST /api/suppliers`: Tạo nhà cung cấp mới.

- **Hóa đơn (`/api/invoices`)**
  - `GET /api/invoices`: Lấy danh sách tất cả hóa đơn.
  - `POST /api/invoices`: Tạo hóa đơn mới.

- **Giao dịch tiền mặt (`/api/cash-transactions`)**
  - `GET /api/cash-transactions`: Lấy danh sách tất cả giao dịch tiền mặt.
  - `POST /api/cash-transactions`: Tạo giao dịch tiền mặt mới.

- **Thông báo (`/api/notification`)**
  - `GET /api/notification`: Lấy thông báo cho người dùng hiện tại.
  - Kết nối WebSocket qua Socket.IO để nhận thông báo realtime.

_(Lưu ý: Để truy cập các endpoint yêu cầu xác thực, bạn cần gửi JWT trong header `Authorization` với format `Bearer <token>`.)_
