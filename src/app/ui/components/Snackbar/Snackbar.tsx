import { WarningIcon } from '@/app/ui/icons/WarningIcon';

type SnackOptions = 'warning' | 'success' | 'info';

interface SnackbarProps {
  type: SnackOptions;
  message: string;
}

const Snackbar = ({ type, message }: SnackbarProps) => {
  return (
    <>
      <div className="fixed inset-x-0 top-5 z-[9999] transition-transform duration-300 ease-out motion-reduce:transition-none">
        <div className="mx-auto max-w-7xl px-3 py-2 sm:px-6 sm:py-3 lg:px-8">
          <div
            className={`rounded-lg text-white shadow-xl ring-1 ring-white/10 bg-slate-50 ${type === 'warning' && 'border-l-red-500'}  border-l-5`}
          >
            <div className="flex flex-col p-3 ">
              <div className="flex items-center">
                {type === 'warning' && (
                  <div className=" rounded-full w-10  h-10 flex justify-center items-center bg-red-100 mr-4">
                    <WarningIcon
                      className={`${type === 'warning' && 'text-red-500'} -mt-1`}
                      size={18}
                    />
                  </div>
                )}
                <p className="text-sm leading-6  text-black">{message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Snackbar;
