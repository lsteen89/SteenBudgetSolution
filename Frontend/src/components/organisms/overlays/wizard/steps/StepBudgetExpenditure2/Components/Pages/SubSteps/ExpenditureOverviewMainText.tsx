import React from 'react';
// icons
import { Home, FileText, Utensils, Car, Shirt, CreditCard } from "lucide-react";

const ExpenditureOverviewMainText: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto text-customBlue1">
      <h3 className="text-3xl font-bold mb-8 text-darkLimeGreen text-center">
        Ta kontroll över dina utgifter!
      </h3>

      <p className="text-xl mb-10 text-center">
        Vi samlar in din data steg för steg. Här är vad vi går igenom:
      </p>

      <div className="space-y-6">
        <div className="flex items-center gap-x-6">
          <Home size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Boende – Hyra, bolån eller andra kostnader.
          </p>
        </div>

        <div className="flex items-center gap-x-6">
          <FileText size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Fasta utgifter – El, vatten, internet och försäkringar.
          </p>
        </div>

        <div className="flex items-center gap-x-6">
          <Utensils size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Mat – Matkostnader och restaurangbesök.
          </p>
        </div>

        <div className="flex items-center gap-x-6">
          <Car size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Transport – Bil eller kollektivtrafik.
          </p>
        </div>

        <div className="flex items-center gap-x-6">
          <Shirt size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Kläder – Uppskattad månadskostnad.
          </p>
        </div>

        <div className="flex items-center gap-x-6">
          <CreditCard size={28} className="text-darkLimeGreen w-[32px] shrink-0" />
          <p className="flex-1 text-left">
            Prenumerationer – Streaming och andra tjänster.
          </p>
        </div>
        <p className="text-xl mb-10 text-center">
        Om något steg inte stämmer för dig kan du hoppa över det.
      </p>
      </div>
    </div>
  );
};

export default ExpenditureOverviewMainText;
