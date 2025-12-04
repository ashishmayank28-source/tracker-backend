// src/components/Card.jsx
export default function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  );
}
