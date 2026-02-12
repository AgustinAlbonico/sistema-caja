import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditoriaService } from '../../modules/auditoria/auditoria.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si no hay usuario autenticado, no auditar
    if (!user || !user.sub) {
      return next.handle();
    }

    const method = request.method;
    const path = request.route?.path || request.path;
    const body = request.body;
    const params = request.params;

    // Determinar acción y entidad basado en método HTTP y ruta
    const { accion, entidad } = this.determinarAccionEntidad(method, path);

    // Si no podemos determinar la acción, no auditar
    if (!accion || !entidad) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const idEntidad = this.obtenerIdEntidad(
            response,
            params,
            body,
            entidad,
          );
          const detalle = JSON.stringify({
            path,
            method,
            requestBody: this.sanitizarBody(body),
            responseId:
              response?.id ||
              response?.idCliente ||
              response?.idRecibo ||
              response?.idGasto ||
              response?.idCaja,
          });

          await this.auditoriaService.registrarAccion({
            idUsuario: user.sub,
            accion,
            entidad,
            idEntidad: idEntidad || undefined,
            detalle,
          });
        } catch (error) {
          // No fallar la request principal si la auditoría falla
          console.error('Error al registrar auditoría:', error);
        }
      }),
    );
  }

  private determinarAccionEntidad(
    method: string,
    path: string,
  ): { accion: string | null; entidad: string | null } {
    // Mapeo de métodos HTTP a acciones
    const accionMap: Record<string, string> = {
      POST: 'CREAR',
      PUT: 'ACTUALIZAR',
      PATCH: 'ACTUALIZAR',
      DELETE: 'ELIMINAR',
    };

    const accion = accionMap[method] || null;

    // Mapeo de rutas a entidades
    let entidad: string | null = null;

    if (path.includes('/clientes')) {
      entidad = 'CLIENTE';
    } else if (path.includes('/recibos')) {
      entidad = 'RECIBO';
    } else if (path.includes('/gastos')) {
      entidad = 'GASTO';
    } else if (path.includes('/caja/abrir')) {
      entidad = 'CAJA';
      return { accion: 'ABRIR_CAJA', entidad };
    } else if (path.includes('/caja/cerrar')) {
      entidad = 'CAJA';
      return { accion: 'CERRAR_CAJA', entidad };
    } else if (path.includes('/caja')) {
      entidad = 'CAJA';
    } else if (path.includes('/metodos-pago')) {
      entidad = 'METODO_PAGO';
    } else if (path.includes('/usuarios')) {
      entidad = 'USUARIO';
    }

    return { accion, entidad };
  }

  private obtenerIdEntidad(
    response: any,
    params: any,
    body: any,
    entidad: string,
  ): number | null {
    // Intentar obtener ID de la respuesta
    if (response) {
      if (response.idCliente) return response.idCliente;
      if (response.idRecibo) return response.idRecibo;
      if (response.idGasto) return response.idGasto;
      if (response.idCaja) return response.idCaja;
      if (response.idUsuario) return response.idUsuario;
      if (response.idMetodoPago) return response.idMetodoPago;
      if (response.id) return response.id;
    }

    // Intentar obtener de los params
    if (params) {
      if (params.idCliente) return parseInt(params.idCliente);
      if (params.idRecibo) return parseInt(params.idRecibo);
      if (params.idGasto) return parseInt(params.idGasto);
      if (params.idCaja) return parseInt(params.idCaja);
      if (params.idUsuario) return parseInt(params.idUsuario);
      if (params.id) return parseInt(params.id);
    }

    return null;
  }

  private sanitizarBody(body: any): any {
    if (!body) return body;

    // Crear copia para no modificar el original
    const sanitizado = { ...body };

    // Eliminar campos sensibles
    delete sanitizado.contrasena;
    delete sanitizado.password;
    delete sanitizado.contrasenaHash;

    return sanitizado;
  }
}
