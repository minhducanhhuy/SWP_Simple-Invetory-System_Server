import { IsNotEmpty, MinLength, Matches, MaxLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Tên đăng nhập không được để trống' })
  @MinLength(5, { message: 'Tên đăng nhập phải có ít nhất 5 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không quá 30 ký tự' })
  // Regex: Cho phép chữ cái và số, không ký tự đặc biệt (tùy logic dự án)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Tên đăng nhập chỉ chứa chữ cái và số',
  })
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  // Regex: Tối thiểu 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu quá yếu (cần chữ hoa, thường, số và ký tự đặc biệt)',
  })
  password: string;
}
