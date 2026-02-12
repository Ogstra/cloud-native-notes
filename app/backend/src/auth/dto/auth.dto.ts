import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsNotEmpty()
    email: string;

    @IsNotEmpty()
    password: string;
}

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;
}
