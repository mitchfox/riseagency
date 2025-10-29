import { IntroModal } from "@/components/IntroModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Intro = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <IntroModal open={open} onOpenChange={handleOpenChange} />
    </div>
  );
};

export default Intro;
