// Context for SSL certificate state (question-local)
// Replaces SharedZone usage for certificate persistence

import { createContext, useContext, useState, type ReactNode } from "react";

type CertificateState = {
	issued: boolean;
	domain: string | null;
};

type CertificateContextValue = {
	certificate: CertificateState;
	setCertificate: (state: CertificateState) => void;
};

const CertificateContext = createContext<CertificateContextValue | null>(null);

export const CertificateProvider = ({ children }: { children: ReactNode }) => {
	const [certificate, setCertificate] = useState<CertificateState>({
		issued: false,
		domain: null,
	});

	return (
		<CertificateContext.Provider value={{ certificate, setCertificate }}>
			{children}
		</CertificateContext.Provider>
	);
};

export const useCertificateContext = () => {
	const context = useContext(CertificateContext);
	if (!context) {
		throw new Error(
			"useCertificateContext must be used within CertificateProvider",
		);
	}
	return context;
};
