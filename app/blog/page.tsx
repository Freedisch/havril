import Link from 'next/link';
import { Brain, ArrowLeft, BookOpen } from 'lucide-react';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md">
        <nav className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-normal text-white">SynapseAI</span>
            </Link>
            
            <Link href="/" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="pt-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-normal mb-8">
            SynapseAI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Blog</span>
          </h1>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Insights, updates, and thought leadership on AI and retail intelligence
          </p>
          
          <div className="flex justify-center mb-12">
            <BookOpen className="w-16 h-16 text-blue-400" />
          </div>
          
          <div className="text-center py-20">
            <p className="text-gray-500">Blog posts coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}