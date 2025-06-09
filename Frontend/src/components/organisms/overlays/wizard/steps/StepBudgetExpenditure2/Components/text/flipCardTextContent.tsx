import React from 'react';

export interface CardContent {
  front: (isMd: boolean) => React.ReactNode;
  back: (isMd: boolean) => React.ReactNode;
}

export type FlipCardPageKey = "foodExpenses" | "fixedExpenses" | "incomeInput" | "anotherPage";

export const flipCardContentByPage: Record<FlipCardPageKey, CardContent> = {
  foodExpenses: {
    front: () => ( // No need for the 'isMd' argument here, but we keep the signature consistent
      <>
        <span className="block text-base font-semibold mb-1">📊 Matkostnader:</span>
        Estimera matkostnader för både hämtmat och köp i matbutik. Ta ett snitt på tre månader för en mer exakt siffra.
      </>
    ),
    back: () => (
      <>
        <span className="block text-base font-semibold mb-1">💡 Tips (Mat):</span>
        Osäker? Använd våra kalkylatorer för att få en uppskattning av dina kostnader. Du kan alltid ändra värden senare!
      </>
    ),
  },
  fixedExpenses: {
    // This function now uses the 'isMd' argument to conditionally render
    front: (isMd) => (
      <>
        <span className="block text-base font-semibold mb-1">📝 Fasta Utgifter:</span>
        {isMd ? (
          // --- Desktop version (isMd is true) ---
          <>
            <p className="mb-2">
              Lista dina regelbundna månadskostnader. Typiska fasta utgifter är exempelvis:
            </p>
            <ul className="list-disc list-inside text-sm">
              <li>Försäkringar</li>
              <li>Telefonabonemang</li>
              <li>Internet</li>
              <li>Elräkningar</li>
            </ul>
          </>
        ) : (
          // --- Mobile version (isMd is false) ---
          <>
            <p>
              Lista dina regelbundna Månads-­kostnader.
              <br /> 
              Typiska fasta utgifter är exempelvis:
            </p>
            <ul className="list-disc list-inside text-sm mt-2">
              <li>Försäkringar</li>
              <li>Telefonabonemang</li>
              <li>Internet</li>
              <li>Elräkningar</li>
            </ul>
          </>
        )}
      </>
    ),
    back: () => (
      <>
        <span className="block text-base font-semibold mb-1">💡 Tips </span>
        <br />
        Har du egna utgifter som inte finns i listan? Lägg till dem under "Övriga utgifter" för att få en komplett bild av din ekonomi.
      </>
    ),
  },
  // Other pages follow the same function pattern
  incomeInput: {
    front: () => (
      <>
        <span className="block text-base font-semibold mb-1">💰 Dina Inkomster:</span>
        Ange alla dina inkomstkällor efter skatt. Detta hjälper oss att skapa en korrekt budget.
      </>
    ),
    back: () => (
      <>
        <span className="block text-base font-semibold mb-1">✨ Kom ihåg:</span>
        Inkludera även eventuella sidoinkomster eller bidrag för en komplett bild.
      </>
    ),
  },
  anotherPage: {
    front: () => (
      <>
        <span className="block text-base font-semibold mb-1">🚀 Ny Sida Fram:</span>
        Information för framsidan av kortet på 'anotherPage'.
      </>
    ),
    back: () => (
      <>
        <span className="block text-base font-semibold mb-1">🔄 Ny Sida Bak:</span>
        Tips och information för baksidan av kortet på 'anotherPage'.
      </>
    ),
  }
};