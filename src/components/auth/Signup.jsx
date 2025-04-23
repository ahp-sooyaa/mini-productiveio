import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {useAuth} from '../../contexts/AuthContext';
import {useForm} from "react-hook-form";
import {z} from "zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Button} from "@/components/ui/button.jsx";
import {zodResolver} from "@hookform/resolvers/zod";

function Signup() {
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const {signUp} = useAuth();
    const navigate = useNavigate();

    const signupSchema = z.object({
        email: z.string().email({ message: "Invalid email address" }),
        password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
        confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    });

    const form = useForm({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: ""
        }
    });

    const onSubmit = async (formData) => {
        setError('');
        setMessage('');

        try {
            await signUp(formData.email, formData.password);

            setMessage('Registration successful! Please check your email for verification.');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            setError(error.message || 'Failed to create an account');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-5 bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>
                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
                {message && <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-md">{message}</div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="text" placeholder="enter email addresss" {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="enter your password" {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="enter your confirm password" {...field}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? 'Signing up' : 'Signup'}
                        </Button>
                    </form>
                </Form>
                <div className="mt-3 text-center">
                    <p className="text-primary hover:text-primary/90 text-sm">
                        Already have an account?
                        <Button asChild variant="link" className="px-0 ml-1">
                            <Link to="/login">
                                Login
                            </Link>
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;
