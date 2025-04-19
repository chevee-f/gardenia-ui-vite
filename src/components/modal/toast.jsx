import { useEffect, useState } from "react";

export default function AppToast({ message, onClose, type  }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === "success") {
        const timer = setTimeout(() => {
        setVisible(false);
        //   onClose();
        }, 2000); // Keeps the toast visible for 3 seconds
        setTimeout(() => {
            onClose();
        }, 3000)
        return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div
      className={`fixed top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
        visible ? "opacity-100 translate-y-18" : "opacity-0 translate-y-0"
      }`}
    >
        <div
        className={`flex items-center max-w-sm w-full text-sm px-4 py-3 rounded-lg shadow-lg border ${
          type === "success"
            ? "bg-green-100 text-green-800 border-green-300"
            : "bg-red-100 text-red-800 border-red-300"
        }`}
      >
        <span>{message}</span>
        {type === "error" && (
          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="ml-4 text-lg text-gray-600 hover:text-gray-800"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
