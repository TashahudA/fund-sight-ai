import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-foreground group-[.toaster]:text-background group-[.toaster]:border-transparent group-[.toaster]:shadow-none group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-background/70",
          actionButton: "group-[.toast]:bg-background group-[.toast]:text-foreground",
          cancelButton: "group-[.toast]:bg-background/20 group-[.toast]:text-background",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
