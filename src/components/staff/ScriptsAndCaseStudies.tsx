import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagingScripts } from "./MessagingScripts";
import { MessagingCaseStudies } from "./MessagingCaseStudies";

export const ScriptsAndCaseStudies = () => (
  <Tabs defaultValue="scripts" className="w-full">
    <TabsList className="mb-4">
      <TabsTrigger value="scripts">Scripts</TabsTrigger>
      <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
    </TabsList>
    <TabsContent value="scripts"><MessagingScripts /></TabsContent>
    <TabsContent value="case-studies"><MessagingCaseStudies /></TabsContent>
  </Tabs>
);

export default ScriptsAndCaseStudies;