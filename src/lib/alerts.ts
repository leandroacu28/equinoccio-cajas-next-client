
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

/**
 * Reusable Toast configuration
 */
const Toast = MySwal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

// --- Alert Functions ---

/**
 * Shows a success toast.
 */
export const showSuccess = (title: string, text?: string) => {
    return Toast.fire({
        icon: "success",
        title,
        text, // Toasts can show text if needed, though usually brief
    });
};

/**
 * Shows an error toast.
 */
export const showError = (title: string, text?: string) => {
    return Toast.fire({
        icon: "error",
        title,
        text,
    });
};

/**
 * Shows a confirmation dialog.
 * Returns true if confirmed, false otherwise.
 */
export const showConfirm = async ({
    title,
    text,
    confirmButtonText = "Sí, confirmar",
    cancelButtonText = "Cancelar",
    confirmButtonColor = "#10b981", // emerald-500 default
}: {
    title: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColor?: string;
}) => {
    const result = await MySwal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor,
        cancelButtonColor: "#6b7280", // gray-500
        confirmButtonText,
        cancelButtonText,
        reverseButtons: true, // Often betterUX on desktop
    });

    return result.isConfirmed;
};

/**
 * Shows a generic toast notification.
 */
export const showToast = (title: string, icon: "success" | "error" | "warning" | "info" = "success") => {
    return Toast.fire({
        icon,
        title,
    });
};
