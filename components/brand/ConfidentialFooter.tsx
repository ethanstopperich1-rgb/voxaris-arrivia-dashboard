export function ConfidentialFooter() {
  return (
    <footer className="border-t border-neutral-800 px-8 py-4 text-center text-xs text-neutral-500">
      VOXARIS · CONFIDENTIAL · Internal Use Only · {new Date().getFullYear()}
    </footer>
  );
}
