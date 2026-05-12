import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagingScripts } from "./MessagingScripts";
import { MessagingCaseStudies } from "./MessagingCaseStudies";
import { RecruitmentPhilosophyHub } from "./RecruitmentPhilosophyHub";

export const ScriptsAndCaseStudies = () => (
  <Tabs defaultValue="philosophy" className="w-full">
    <TabsList className="mb-4">
      <TabsTrigger value="philosophy">Philosophy</TabsTrigger>
      <TabsTrigger value="scripts">Templates</TabsTrigger>
      <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
    </TabsList>
    <TabsContent value="philosophy"><RecruitmentPhilosophyHub /></TabsContent>
    <TabsContent value="scripts"><MessagingScripts /></TabsContent>
    <TabsContent value="case-studies"><MessagingCaseStudies /></TabsContent>
  </Tabs>
);

export default ScriptsAndCaseStudies;