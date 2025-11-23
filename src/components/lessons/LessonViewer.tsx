import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, StarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LessonSection {
  title: string;
  content: string;
}

interface LessonViewerProps {
  lessonTitle: string;
  lessonCategory: string;
  sections: LessonSection[];
  onComplete?: () => void;
}

export function LessonViewer({ lessonTitle, lessonCategory, sections, onComplete }: LessonViewerProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [starredSections, setStarredSections] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const isFirstSection = currentSection === 0;
  const isLastSection = currentSection === sections.length - 1;

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSection(prev => prev + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    if (!isFirstSection) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleStar = async () => {
    const section = sections[currentSection];
    const isStarred = starredSections.has(currentSection);

    try {
      setLoading(true);

      if (isStarred) {
        // Remove bookmark
        const { error } = await supabase
          .from('lesson_bookmarks')
          .delete()
          .eq('lesson_title', lessonTitle)
          .eq('section_index', currentSection);

        if (error) throw error;

        setStarredSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentSection);
          return newSet;
        });

        toast.success('Removed from My Notes');
      } else {
        // Add bookmark
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please sign in to save notes');
          return;
        }

        const { error } = await supabase
          .from('lesson_bookmarks')
          .insert({
            user_id: user.id,
            lesson_title: lessonTitle,
            lesson_category: lessonCategory,
            section_title: section.title,
            section_content: section.content,
            section_index: currentSection
          });

        if (error) throw error;

        setStarredSections(prev => new Set(prev).add(currentSection));
        toast.success('Saved to My Notes');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  const currentSectionData = sections[currentSection];

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Section {currentSection + 1} of {sections.length}</span>
        <div className="flex gap-1">
          {sections.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-all ${
                index === currentSection
                  ? 'bg-primary'
                  : index < currentSection
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Section Content */}
      <Card className="gradient-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-2xl">{currentSectionData.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStar}
              disabled={loading}
              className="shrink-0"
            >
              {starredSections.has(currentSection) ? (
                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              ) : (
                <StarOff className="w-5 h-5" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="prose prose-invert max-w-none">
            <div className="text-foreground leading-relaxed whitespace-pre-wrap">
              {currentSectionData.content}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstSection}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={handleNext}
          className="flex-1"
        >
          {isLastSection ? 'Complete Lesson' : 'Next'}
          {!isLastSection && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
