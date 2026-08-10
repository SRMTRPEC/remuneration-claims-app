import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function PopupMessage({ type = 'success', title, message, onClose }) {
  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-md shadow-mega w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-brand-primary transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {isSuccess ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          </div>
          
          <div>
            <h3 className="font-primary text-xl font-bold text-brand-primary mb-1">
              {title || (isSuccess ? 'Success!' : 'Error')}
            </h3>
            <p className="text-sm text-text-secondary">
              {message}
            </p>
          </div>

          <button 
            onClick={onClose}
            className={`w-full py-3 rounded-full font-mono text-xs uppercase tracking-widest font-bold transition-colors ${
              isSuccess 
                ? 'bg-brand-accent hover:bg-brand-primary text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isSuccess ? 'Continue' : 'Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}
