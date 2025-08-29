import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const submissionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  category: z.enum(['film', 'fictional', 'political'], {
    required_error: "Please select a category",
  }),
  image: z.instanceof(File, { message: "Please select an image" }),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmissionModal({ isOpen, onClose, onSubmitted }: SubmissionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      name: "",
      category: undefined,
      image: undefined,
    },
  });

  const submitPostMutation = useMutation({
    mutationFn: async (data: SubmissionForm) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('category', data.category);
      formData.append('image', data.image);

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit post');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post submitted!",
        description: "Your post has been submitted for review. It will appear after admin approval.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      form.reset();
      setImagePreview(null);
      onSubmitted();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes('Rate limit')
          ? "Please wait before submitting another post"
          : "Failed to submit post",
        variant: "destructive",
      });
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('image', file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: SubmissionForm) => {
    submitPostMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setImagePreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Submit New Celebrity Post</DialogTitle>
          <p className="text-muted-foreground mt-2">
            Share your favorite celebrity, character, or politician for others to vote on!
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter celebrity/character name"
                      {...field}
                      data-testid="input-post-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Category Field */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-post-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="film">Film Stars</SelectItem>
                      <SelectItem value="fictional">Fictional Characters</SelectItem>
                      <SelectItem value="political">Political Figures</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Image Upload Field */}
            <div>
              <Label>Image *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/50 hover:bg-muted transition-colors">
                <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground mb-4"></i>
                <p className="text-muted-foreground mb-2">Drag & drop an image here, or click to browse</p>
                <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                  id="image-upload"
                  data-testid="input-image-upload"
                />
                <Button
                  type="button"
                  className="mt-4"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  data-testid="button-choose-file"
                >
                  Choose File
                </Button>
              </div>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4" data-testid="div-image-preview">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded-lg border border-border"
                  />
                </div>
              )}
              
              {form.formState.errors.image && (
                <p className="text-destructive text-sm mt-1">
                  {form.formState.errors.image.message}
                </p>
              )}
            </div>
            
            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                data-testid="button-cancel-submit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitPostMutation.isPending}
                data-testid="button-submit-post-final"
              >
                <i className="fas fa-paper-plane mr-2"></i>
                {submitPostMutation.isPending ? 'Submitting...' : 'Submit Post'}
              </Button>
            </div>
            
            {/* Submission Notice */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                <i className="fas fa-info-circle mr-1"></i>
                Your post will be reviewed by moderators before appearing publicly. This usually takes 1-2 hours.
              </p>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
