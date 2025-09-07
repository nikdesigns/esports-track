// app/news/page.tsx
'use client';

import { useState } from 'react';
import { Globe, Calendar } from 'lucide-react';

type NewsArticle = {
  title: string;
  date: string;
  source: string;
  excerpt: string;
  fullArticleUrl: string;
};

const mockNews: NewsArticle[] = [
  {
    title: 'Team Spirit wins The International 2025',
    date: '2025-10-29',
    source: 'Esports.com',
    excerpt:
      'In a stunning grand final, Team Spirit claimed victory over PSG.LGD to lift the Aegis of Champions...',
    fullArticleUrl: '#',
  },
  {
    title: 'NaVi crowned CS:GO Major champions',
    date: '2025-07-20',
    source: 'HLTV',
    excerpt:
      'NaVi have once again secured their dominance in CS:GO after defeating G2 in a thrilling final...',
    fullArticleUrl: '#',
  },
  {
    title: 'Fnatic claims Valorant Champions 2025',
    date: '2025-08-15',
    source: 'VLR.gg',
    excerpt:
      'Fnatic showcased an incredible performance to defeat LOUD in the Valorant Champions grand finals...',
    fullArticleUrl: '#',
  },
];

export default function NewsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 space-y-6 text-gray-200">
      <h1 className="text-3xl font-bold text-white">Esports News</h1>

      <div className="bg-[#121212] border border-gray-800 rounded-lg divide-y divide-gray-800">
        {mockNews.map((article, idx) => (
          <div key={article.title}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="grid grid-cols-3 px-4 py-3 hover:bg-[#1a1a1a] cursor-pointer"
            >
              <span className="font-semibold">{article.title}</span>
              <span>{article.source}</span>
              <span className="text-gray-400">{article.date}</span>
            </div>

            {/* Expanded */}
            {expanded === idx && (
              <div className="px-6 py-3 bg-[#1a1a1a] border-t border-gray-800 text-sm text-gray-300">
                <p className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span>{article.source}</span>
                </p>
                <p className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{article.date}</span>
                </p>
                <p className="mt-2">{article.excerpt}</p>
                <a
                  href={article.fullArticleUrl}
                  className="text-blue-400 hover:underline mt-2 block"
                >
                  Read full article →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
