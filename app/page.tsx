'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, ArrowRight, Search, Shield, Calculator } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze article');
      }

      // Navigate to article page
      router.push(`/articles/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PoliSight
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Understand policy articles deeply. Decompose arguments, detect omissions,
            and calculate your personal impact.
          </p>
        </div>

        {/* Main Input Card */}
        <Card className="w-full max-w-xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Analyze an Article
            </CardTitle>
            <CardDescription>
              Enter the URL of a policy article to begin analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://example.com/article..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base"
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <FeatureCard
            icon={<Search className="w-6 h-6" />}
            title="Argument Decomposition"
            description="Identify claims, assumptions, predictions, and underlying values in policy articles."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Omission Detection"
            description="Discover what the article doesn't tell you - missing sources, stakeholders, and context."
          />
          <FeatureCard
            icon={<Calculator className="w-6 h-6" />}
            title="Personal Impact"
            description="Calculate how policies could affect your finances based on your personal profile."
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500">
          <p>PoliSight helps you become a more informed citizen.</p>
          <p className="mt-1">All analysis is transparent and verifiable.</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-lg bg-white border hover:shadow-md transition-shadow">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
