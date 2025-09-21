import { useState } from 'react';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

export function AuthForm() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const switchToLogin = () => setIsLoginMode(true);
  const switchToRegister = () => setIsLoginMode(false);

  return isLoginMode ? (
    <LoginPage onSwitchToRegister={switchToRegister} />
  ) : (
    <RegisterPage onSwitchToLogin={switchToLogin} />
  );
}