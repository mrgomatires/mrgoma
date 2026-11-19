import Image from 'next/image';
import Link from 'next/link';

import LoginForm from '@/app/ui/components/LoginForm/LoginForm';
import { BoxIcon } from '@/app/ui/icons/BoxIcon';
import { DocumentIcon } from '@/app/ui/icons/DocumentIcon';
import { DollyIcon } from '@/app/ui/icons/DollyIcon';

import { mrGomaLogoLight } from '#public/assets/images/Logo';

const Login = () => {
  return (
    <div className="grid grid-cols-12 bg-black">
      <div className="bg-[url(/assets/images/tireLogin.png)] bg-cover col-span-5 bg-bottom hidden lg:flex flex-col  justify-between px-12 py-12">
        <div className="pb-12">
          <Link href="/">
            <Image
              alt="MrGoma Tires logo"
              title="Go to the home page"
              src={mrGomaLogoLight || '/placeholder.svg'}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>
        <div>
          <h3 className="text-white text-5xl font-semibold mb-3">Welcome back</h3>
          <p className="text-slate-400 mb-12 text-base">
            Manage your tire sales and view key updates from your dashboard
          </p>
          <ul className="mt-8">
            <li className="flex items-center mb-4">
              <div className="border border-[#9dfb40] w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <DocumentIcon size={30} className="text-[#9dfb40]" />
              </div>
              <div>
                <h5 className="text-white text-sm mb-0.5">Sales record</h5>
                <p className="text-xs text-slate-400">Capture and track your sales</p>
              </div>
            </li>
            <li className="flex items-center mb-4">
              <div className="border border-[#9dfb40] w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <BoxIcon size={30} className="text-[#9dfb40]" />
              </div>
              <div>
                <h5 className="text-white text-sm mb-0.5">Product Catalog </h5>
                <p className="text-xs text-slate-400">Check prices and updated availability</p>
              </div>
            </li>

            <li className="flex items-center">
              <div className="border border-[#9dfb40] w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <DollyIcon size={30} className="text-[#9dfb40]" />
              </div>
              <div>
                <h5 className="text-white text-sm mb-0.5">Logistics</h5>
                <p className="text-xs text-slate-400">View the overall status of deliveries</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-7 min-h-dvh flex items-center justify-center py-24 relative p y-8   bg-[url(/assets/images/tireLogin.png)] bg-cover lg:bg-none">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
