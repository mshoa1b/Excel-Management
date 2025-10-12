// Type declarations for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
  }
}