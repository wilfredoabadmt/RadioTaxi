import React from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, description, children }) => {
  return (
    <section style={{
      background: '#fff',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 18px 40px rgba(15,23,42,0.08)',
      marginBottom: 24
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
        <p style={{ margin: '8px 0 0', color: '#475569' }}>{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
};

export default SectionCard;
