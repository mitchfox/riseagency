import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, FileText, Megaphone, BookOpen } from "lucide-react";
import BlogManagement from "./BlogManagement";
import BetweenTheLinesManagement from "./BetweenTheLinesManagement";
import PressReleasesManagement from "./PressReleasesManagement";
import { OpenAccessManagement } from "./OpenAccessManagement";

interface PublicContentManagementProps {
  isAdmin: boolean;
}

export const PublicContentManagement = ({ isAdmin }: PublicContentManagementProps) => {
  const [activeTab, setActiveTab] = useState("news");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Public Content</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-1 grid grid-cols-4 gap-1">
          <TabsTrigger value="news" className="gap-2 text-xs sm:text-sm py-2">
            <Newspaper className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">News Articles</span>
            <span className="sm:hidden">News</span>
          </TabsTrigger>
          <TabsTrigger value="btl" className="gap-2 text-xs sm:text-sm py-2">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Between The Lines</span>
            <span className="sm:hidden">BTL</span>
          </TabsTrigger>
          <TabsTrigger value="press" className="gap-2 text-xs sm:text-sm py-2">
            <Megaphone className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Press Releases</span>
            <span className="sm:hidden">Press</span>
          </TabsTrigger>
          <TabsTrigger value="openaccess" className="gap-2 text-xs sm:text-sm py-2">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Open Access</span>
            <span className="sm:hidden">OA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-4">
          <BlogManagement isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="btl" className="mt-4">
          <BetweenTheLinesManagement isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="press" className="mt-4">
          <PressReleasesManagement />
        </TabsContent>

        <TabsContent value="openaccess" className="mt-4">
          <OpenAccessManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PublicContentManagement;
