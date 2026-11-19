'use client';
import React, { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useForm, SubmitHandler } from 'react-hook-form';

import BrandHeadline from '@/app/ui/components/BrandHeadline/BrandHeadline';
import ButtonSpinner from '@/app/ui/components/ButtonSpinner/ButtonSpinner';
import InputError from '@/app/ui/components/InputError/InputError';
import { LoginSchema, Inputs } from '@/app/ui/components/LoginForm/schema/loginSchema';
import Snackbar from '@/app/ui/components/Snackbar/Snackbar';
import { ArrowLeftIcon } from '@/app/ui/icons/ArrowLeftIcon';
import { EyeIcon } from '@/app/ui/icons/EyeIcon';
import { EyeOffIcon } from '@/app/ui/icons/EyeOffIcon';
import { LockIcon } from '@/app/ui/icons/LockIcon';
import { UserIcon } from '@/app/ui/icons/UserIcon';

import { mrGomaLogoLight } from '#public/assets/images/Logo';

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState(true);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>({
    resolver: zodResolver(LoginSchema),
    mode: 'onSubmit',
  });

  const processForm: SubmitHandler<Inputs> = async loginData => {
    setIsLoading(true);
    setError(false);

    try {
      const res = await signIn('credentials', {
        callbackUrl: '/suppliers/login',
        username: loginData.username,
        password: loginData.password,
        redirect: false,
      });

      if (res?.error) {
        setError(true);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full sm:max-w-lg px-8">
      <div className="flex justify-center lg:hidden mb-2">
        <Link href="/">
          <Image
            alt="MrGoma Tires logo"
            title="Go to the home page"
            src={mrGomaLogoLight || '/placeholder.svg'}
            className="w-64"
            priority
          />
        </Link>
      </div>
      <BrandHeadline as="h2" size="sm" className="mb-8 lg:hidden" inline />
      <form className="w-full" onSubmit={handleSubmit(processForm)}>
        <div className="flex justify-between items-start">
          <div className="mb-0">
            <h1 className="text-2xl font-medium text-white mb-1.5">Seller Portal</h1>
            <h5 className="text-white font-light text-xs mb-8">
              Sign in with your employee account
            </h5>
          </div>
          <div>
            <Link
              className="text-white flex text-[11px] items-center border border-white hover:border-[#9dfb40] rounded-xl px-2 py-0.5 hover:text-[#9dfb40]"
              href="/"
            >
              <ArrowLeftIcon className="mr-2 text-white" size={14} />
              MrGoma Website
            </Link>
          </div>
        </div>

        <div className="mb-4 relative">
          <label className="text-sm mb-2 block text-white" htmlFor="username">
            <span className="text-lime-400 mr-2">*</span>
            User
          </label>
          <div className="relative">
            <input
              {...register('username')}
              type="text"
              autoComplete="off"
              className="w-full pl-10 text-white bg-slate-800 rounded-md py-2 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-shadow placeholder:text-sm font-light"
            />
            <UserIcon className="text-slate-400 absolute top-1/2 left-3 transform -translate-y-1/2 h-4 w-4" />
          </div>
          <InputError message={errors?.username?.message} />
        </div>
        <div className="mb-4">
          <label className="text-sm mb-2 block text-white" htmlFor="password">
            <span className="text-lime-400 mr-2">*</span>
            Password
          </label>
          <div className="relative">
            <input
              {...register('password')}
              type={passwordVisibility ? 'password' : 'text'}
              autoComplete="off"
              className="w-full bg-slate-800 pl-10 pr-10 text-white rounded-md py-2 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-shadow border border-transparent placeholder:text-sm font-light"
            />
            <LockIcon
              className="text-slate-400 absolute top-1/2 left-3 transform -translate-y-1/2"
              size={20}
            />
            {passwordVisibility ? (
              <span
                onClick={() => setPasswordVisibility(false)}
                className="text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 "
              >
                <EyeOffIcon size={20} />
              </span>
            ) : (
              <span
                onClick={() => setPasswordVisibility(true)}
                className="text-slate-400 absolute top-1/2 right-3 transform -translate-y-1/2 "
              >
                <EyeIcon size={20} />
              </span>
            )}
          </div>
        </div>
        <div className="mt-6">
          {isLoading ? (
            <ButtonSpinner text={'Logging in…'} />
          ) : (
            <button
              type="submit"
              className="w-full py-2 text-base font-medium rounded-lg transition-colors bg-[#9dfb40] text-black cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </form>
      {error && <Snackbar type={'warning'} message={'Invalid username or password.'} />}
    </div>
  );
};

export default LoginForm;
