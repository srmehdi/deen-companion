import { TestBed } from '@angular/core/testing';

import { StatusModalService } from './status-modal-service';

describe('StatusModalService', () => {
  let service: StatusModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
