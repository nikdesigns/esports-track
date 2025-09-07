// components/FallbackImage.tsx
import { Shield } from 'lucide-react';

interface FallbackImageProps {
  size?: number; // customizable size
  label?: string; // optional team short name/acronym
}

export default function FallbackImage({
  size = 40,
  label,
}: FallbackImageProps) {
  return (
    <div
      className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center border border-gray-600 shadow-md"
      style={{ width: size, height: size }}
    >
      {label ? (
        <span className="text-white font-bold text-xs">{label}</span>
      ) : (
        <Shield className="text-gray-400 w-4 h-4" />
      )}
    </div>
  );
}
