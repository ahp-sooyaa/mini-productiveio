import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {useAuth} from '../../contexts/AuthContext';
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "../../components/ui/form";
import {Input} from "../../components/ui/input";
import {Button} from "../../components/ui/button";

function Login() {
    const {signIn} = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const loginSchema = z.object({
        email: z.string().email({message: "Invalid email address"}),
        password: z.string(),
    });

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: ''
        }
    });

    const onSubmit = async (data) => {
        setError('');

        try {
            await signIn(data.email, data.password);
            navigate('/tasks');
        } catch (error) {
            setError(error.message || 'Failed to sign in');
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-5 bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className='text-2xl font-bold text-center mb-6'>Login</h2>
                {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="text" placeholder="you@example.com" {...field} />
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
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </Form>
                <div className="mt-3 text-center text-primary hover:text-primary/90 text-sm">
                    <Button asChild variant='link'>
                        <Link to="/forgot-password">Forgot Password?</Link>
                    </Button>
                    <p>
                        Don't have an account? <Button asChild variant="link" className="px-0"><Link to="/signup">Sign
                        Up</Link></Button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
