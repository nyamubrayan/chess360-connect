import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsSource {
  name: string;
  url: string;
  category: string;
}

// Reliable chess news sources with RSS feeds
const newsSources: NewsSource[] = [
  {
    name: 'Chess.com News',
    url: 'https://www.chess.com/news',
    category: 'general'
  },
  {
    name: 'FIDE News',
    url: 'https://www.fide.com/news',
    category: 'tournaments'
  },
  {
    name: 'Lichess Blog',
    url: 'https://lichess.org/blog',
    category: 'general'
  }
];

async function fetchNewsFromChessCom(): Promise<any[]> {
  try {
    console.log('Fetching news from Chess.com...');
    const response = await fetch('https://www.chess.com/news/api/latest', {
      headers: {
        'User-Agent': 'Chessafari-News-Bot/1.0',
      }
    });
    
    if (!response.ok) {
      console.error('Chess.com API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.slice(0, 5).map((article: any) => ({
      title: article.title,
      content: article.description || article.short_description || 'Read the full article for more details.',
      image_url: article.image || null,
      category: 'general',
      published_at: new Date(article.date * 1000).toISOString()
    }));
  } catch (error) {
    console.error('Error fetching Chess.com news:', error);
    return [];
  }
}

async function fetchNewsFromLichess(): Promise<any[]> {
  try {
    console.log('Fetching news from Lichess blog...');
    const response = await fetch('https://lichess.org/blog/community', {
      headers: {
        'User-Agent': 'Chessafari-News-Bot/1.0',
      }
    });
    
    if (!response.ok) {
      console.error('Lichess blog error:', response.status);
      return [];
    }
    
    const html = await response.text();
    
    // Simple HTML parsing to extract blog posts
    const articles: any[] = [];
    const articleMatches = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
    
    for (const articleHtml of articleMatches.slice(0, 3)) {
      const titleMatch = articleHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const contentMatch = articleHtml.match(/<p[^>]*>(.*?)<\/p>/i);
      
      if (titleMatch) {
        articles.push({
          title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
          content: contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '').trim() : 'Read more on Lichess blog.',
          image_url: null,
          category: 'community',
          published_at: new Date().toISOString()
        });
      }
    }
    
    return articles;
  } catch (error) {
    console.error('Error fetching Lichess blog:', error);
    return [];
  }
}

async function generateChessNewsWithAI(): Promise<any[]> {
  try {
    console.log('Generating chess news summary with AI...');
    
    const prompt = `Generate 2-3 short, engaging chess news articles about recent events in the chess world. Include topics like:
    - Major tournament results
    - Chess player achievements
    - Chess strategy tips
    - Chess community events
    
    Format as JSON array with objects containing: title, content (2-3 sentences), category (one of: tournaments, strategy, community, general)`;
    
    const response = await fetch('https://api.lovable.app/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      console.error('Lovable AI error:', response.status);
      return [];
    }
    
    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) return [];
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const articles = JSON.parse(jsonMatch[0]);
    return articles.map((article: any) => ({
      ...article,
      image_url: null,
      published_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error generating AI news:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting chess news fetch...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get a system user ID for authoring articles (first admin or create a system account)
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    
    if (!profiles) {
      throw new Error('No user profile found to author news articles');
    }
    
    const authorId = profiles.id;

    // Fetch news from multiple sources
    const [chessComNews, lichessNews, aiNews] = await Promise.all([
      fetchNewsFromChessCom(),
      fetchNewsFromLichess(),
      generateChessNewsWithAI()
    ]);

    const allNews = [...chessComNews, ...lichessNews, ...aiNews];
    console.log(`Fetched ${allNews.length} news articles from all sources`);

    if (allNews.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No news articles found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing articles with similar titles to avoid duplicates
    const { data: existingArticles } = await supabaseClient
      .from('news_articles')
      .select('title')
      .in('title', allNews.map(n => n.title));

    const existingTitles = new Set(existingArticles?.map(a => a.title) || []);
    const newArticles = allNews.filter(article => !existingTitles.has(article.title));

    console.log(`${newArticles.length} new articles to insert (${allNews.length - newArticles.length} duplicates skipped)`);

    if (newArticles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No new articles to add',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new articles
    const articlesToInsert = newArticles.map(article => ({
      ...article,
      author_id: authorId,
      views_count: 0
    }));

    const { data: insertedArticles, error: insertError } = await supabaseClient
      .from('news_articles')
      .insert(articlesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting articles:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedArticles?.length || 0} new articles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Chess news updated successfully',
        count: insertedArticles?.length || 0,
        articles: insertedArticles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-chess-news function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        count: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
