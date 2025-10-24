import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const News = () => {
  const newsItems = [
    {
      id: 1,
      title: "Rise Football Agency Expands Operations",
      date: "2024-03-15",
      excerpt: "We are excited to announce the expansion of our scouting network across Europe and South America.",
      category: "Company News"
    },
    {
      id: 2,
      title: "New Partnership Announcement",
      date: "2024-03-10",
      excerpt: "Strategic partnership with leading sports performance centers to enhance player development programs.",
      category: "Partnerships"
    },
    {
      id: 3,
      title: "Player Success Story",
      date: "2024-03-05",
      excerpt: "Celebrating another successful transfer as our client secures a move to a top-tier European club.",
      category: "Player News"
    }
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-24 md:pt-16 touch-pan-y overflow-x-hidden">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bebas uppercase tracking-wider text-foreground mb-12 text-center">
              Latest News
            </h1>
            
            <div className="space-y-8">
              {newsItems.map((item) => (
                <Card key={item.id} className="border-primary/20 hover:border-primary transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary font-bebas uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <CardTitle className="text-3xl font-bebas uppercase tracking-wider">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground">
                      {item.excerpt}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default News;
