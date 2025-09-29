# Auth Service

Microservice xử lý Authentication và Authorization cho hệ thống Chat Application.

## Tính năng

- **Authentication**: Đăng ký/Đăng nhập với email hoặc username
- **JWT Token**: Access token (15 phút) + Refresh token (7 ngày)
- **Session Management**: Quản lý session với thông tin thiết bị
- **Two-Factor Authentication**: Hỗ trợ 2FA với Google Authenticator
- **Security**: Rate limiting, bcrypt hashing, httpOnly cookies
- **Device Tracking**: Theo dõi thiết bị đăng nhập

## Cài đặt

### 1. Clone và cài đặt dependencies
```bash
npm install
```

### 2. Setup môi trường
```bash
cp .env.example .env
# Chỉnh sửa các giá trị trong .env
```

### 3. Chạy với Docker
```bash
docker-compose up -d
```

### 4. Chạy migrations
```bash
# Database sẽ tự động được tạo khi khởi động container
# Hoặc chạy manual:
npm run migration:run
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Đăng ký
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Đăng xuất
- `POST /api/v1/auth/logout-all` - Đăng xuất tất cả thiết bị

### Two-Factor Authentication
- `POST /api/v1/auth/2fa/generate` - Tạo secret cho 2FA
- `POST /api/v1/auth/2fa/enable` - Bật 2FA
- `POST /api/v1/auth/2fa/disable` - Tắt 2FA

### User Profile
- `GET /api/v1/auth/me` - Lấy thông tin user hiện tại
- `GET /api/v1/users/profile` - Lấy profile đầy đủ
- `PATCH /api/v1/users/profile` - Cập nhật profile

### Sessions
- `GET /api/v1/auth/sessions` - Lấy danh sách session

## Database Schema

Service sử dụng 2 bảng chính:
- `users`: Lưu thông tin người dùng
- `user_sessions`: Quản lý session và refresh token

## Security Features

- **Password Hashing**: bcrypt với 12 rounds
- **JWT Security**: Secret key mạnh, expires time ngắn
- **Rate Limiting**: Giới hạn requests đăng ký/đăng nhập
- **HttpOnly Cookies**: Refresh token được lưu trong httpOnly cookie
- **Session Tracking**: Theo dõi thiết bị và IP address
- **2FA Support**: Time-based OTP với Google Authenticator

## Environment Variables

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=chat_app
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

## Development

```bash
# Chạy development mode
npm run start:dev

# Build
npm run build

# Test
npm run test

# Lint
npm run lint
```

## Production Deployment

1. Build Docker image:
```bash
docker build -t auth-service:latest .
```

2. Chạy với production config:
```bash
docker run -p 3001:3001 -e NODE_ENV=production auth-service:latest
```

## Architecture

```
src/
├── modules/
│   ├── auth/           # Authentication logic
│   ├── users/          # User management
│   └── sessions/       # Session management
├── config/             # Configuration files
├── database/           # Migrations & seeds
└── main.ts            # Application entry point
